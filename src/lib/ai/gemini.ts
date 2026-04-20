import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";
import type { GeminiParsedOrder } from "@/types/workflows";

function getGeminiClient(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

export async function parseOrderFromMessage(
  messageText: string
): Promise<GeminiParsedOrder> {
  const genAI = getGeminiClient();
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

    const parsed = JSON.parse(jsonMatch[1].trim()) as GeminiParsedOrder;

    if (!parsed.name || !parsed.email || !Array.isArray(parsed.products)) {
      throw new Error("Incomplete order data from Gemini");
    }

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
    throw error;
  }
}
