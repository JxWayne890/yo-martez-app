import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type { GeminiParsedOrder } from "@/types/workflows";

const ORDER_FORMAT_HELP =
  'Include customer name, email, and at least one product. Example: "New order from Jane Doe (jane@example.com): 1x Yo! Crewneck size L".';

function getGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  return apiKey ? new GoogleGenerativeAI(apiKey) : null;
}

function extractEmail(messageText: string): string | null {
  return (
    messageText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null
  );
}

function cleanCustomerName(value: string): string {
  return value
    .replace(/^new\s+order\s*/i, "")
    .replace(/^order\s*/i, "")
    .replace(/^from\s+/i, "")
    .replace(/[<>():,;-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractName(messageText: string, email: string): string | null {
  const beforeEmail = messageText.slice(0, messageText.indexOf(email));
  const fromMatch = beforeEmail.match(/\bfrom\s+(.+)$/i);
  const rawName = cleanCustomerName(fromMatch?.[1] || beforeEmail);

  return rawName || null;
}

function getProductSegment(messageText: string, email: string): string {
  const afterColon = messageText.split(":").slice(1).join(":").trim();
  if (afterColon) return afterColon;

  const afterEmail = messageText
    .slice(messageText.indexOf(email) + email.length)
    .replace(/^[\s<>():,;-]+/, "")
    .trim();

  return afterEmail;
}

function parseProductLine(
  value: string
): GeminiParsedOrder["products"][number] | null {
  const withoutPrice = value.replace(/\$[0-9]+(?:\.[0-9]{1,2})?/g, "").trim();
  const priceMatch = value.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/);
  const price = priceMatch ? Number(priceMatch[1]) : null;

  const quantityPrefix = withoutPrice.match(/^(\d+)\s*x?\s+(.+)$/i);
  const quantitySuffix = withoutPrice.match(/^(.+?)\s+x\s*(\d+)$/i);
  const quantity = Number(quantityPrefix?.[1] || quantitySuffix?.[2] || 1);
  const product = (quantityPrefix?.[2] || quantitySuffix?.[1] || withoutPrice)
    .replace(/^(and|plus|with)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!product) return null;

  return {
    product,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    price: price !== null && Number.isFinite(price) ? price : null,
  };
}

function parseOrderWithoutAi(messageText: string): GeminiParsedOrder {
  const email = extractEmail(messageText);

  if (!email) {
    throw new Error(
      `Draft order needs a customer email so Shopify can send the invoice. ${ORDER_FORMAT_HELP}`
    );
  }

  const name = extractName(messageText, email);
  if (!name) {
    throw new Error(`Draft order needs a customer name. ${ORDER_FORMAT_HELP}`);
  }

  const productSegment = getProductSegment(messageText, email);
  const products = productSegment
    .split(/[,;\n]|\s+\+\s+/)
    .map((line) => parseProductLine(line.trim()))
    .filter((product): product is GeminiParsedOrder["products"][number] =>
      Boolean(product)
    );

  if (products.length === 0) {
    throw new Error(
      `Draft order needs at least one product after the customer email. ${ORDER_FORMAT_HELP}`
    );
  }

  return { name, email, products };
}

function validateParsedOrder(parsed: GeminiParsedOrder): GeminiParsedOrder {
  if (!parsed.name || !parsed.email || !Array.isArray(parsed.products)) {
    throw new Error(
      `Could not find the full customer and product details. ${ORDER_FORMAT_HELP}`
    );
  }

  if (parsed.products.length === 0) {
    throw new Error(
      `Draft order needs at least one product. ${ORDER_FORMAT_HELP}`
    );
  }

  return parsed;
}

function friendlyGeminiError(error: unknown, fallbackError: unknown): Error {
  if (fallbackError instanceof Error) {
    return fallbackError;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("API_KEY_INVALID") ||
    message.includes("API key not valid")
  ) {
    return new Error(
      `The AI parser is unavailable because the Gemini API key is invalid. ${ORDER_FORMAT_HELP}`
    );
  }

  return new Error(`Could not parse order details. ${ORDER_FORMAT_HELP}`);
}

export async function parseOrderFromMessage(
  messageText: string
): Promise<GeminiParsedOrder> {
  let fallbackParsed: GeminiParsedOrder | null = null;
  let fallbackError: unknown = null;

  try {
    fallbackParsed = parseOrderWithoutAi(messageText);
  } catch (error) {
    fallbackError = error;
  }

  const genAI = getGeminiClient();
  if (!genAI) {
    if (fallbackParsed) {
      logger.warn("Gemini key missing; using non-AI draft order parser", {
        name: fallbackParsed.name,
        productCount: fallbackParsed.products.length,
      });
      return fallbackParsed;
    }

    throw friendlyGeminiError(
      new Error("GEMINI_API_KEY is missing"),
      fallbackError
    );
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an order extraction assistant. Parse the following message and extract order information.

Return ONLY valid JSON in this exact format:
{
  "name": "Customer full name",
  "email": "customer@email.com",
  "products": [
    {
      "product": "Product name",
      "quantity": 1,
      "price": 29.99
    }
  ]
}

If a field is not found, use null. If quantity is not specified, default to 1.
If price is not specified, use null (it will be looked up from the catalog).

Message to parse:
${messageText}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      responseText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response");
    }

    const parsed = validateParsedOrder(
      JSON.parse(jsonMatch[1].trim()) as GeminiParsedOrder
    );

    logger.info("Gemini parsed order successfully", {
      name: parsed.name,
      productCount: parsed.products.length,
    });

    return parsed;
  } catch (error) {
    logger.error("Gemini parsing failed", {
      error: error instanceof Error ? error.message : String(error),
      messageText: messageText.substring(0, 200),
    });

    if (fallbackParsed) {
      logger.warn("Using non-AI draft order parser after Gemini failure", {
        name: fallbackParsed.name,
        productCount: fallbackParsed.products.length,
      });
      return fallbackParsed;
    }

    throw friendlyGeminiError(error, fallbackError);
  }
}
