import { supabase } from "@/lib/supabase";
import { parseOrderFromMessage } from "@/lib/ai/gemini";
import { fetchProductCatalog, fuzzyMatchProduct } from "@/lib/shopify/products";
import { createDraftOrder, sendDraftOrderInvoice } from "@/lib/shopify/draft-orders";
import { logger } from "@/lib/logger";
import { incrementUsage } from "@/lib/usage";
import type { MatchedLineItem } from "@/types/workflows";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await supabase
    .from("DraftOrderLog")
    .select(
      "id, shopifyDraftOrderId, customerName, customerEmail, parsedProducts, matchedVariants, status, errorMessage, createdAt",
      { count: "exact" }
    )
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Draft orders error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  const total = count || 0;

  return Response.json({
    orders: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: Request) {
  let messageText: string;
  try {
    const body = await request.json();
    messageText = typeof body.messageText === "string" ? body.messageText.trim() : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!messageText) {
    return Response.json({ error: "messageText is required" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parseOrderFromMessage(messageText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Could not parse order: ${message}` },
      { status: 422 }
    );
  }

  const catalog = await fetchProductCatalog();
  const matchedItems: MatchedLineItem[] = [];
  const unmatchedProducts: string[] = [];

  for (const product of parsed.products) {
    const match = fuzzyMatchProduct(product.product, catalog);
    if (match) {
      matchedItems.push({
        title: match.title,
        variant_id: match.variantId,
        quantity: product.quantity || 1,
        price: product.price ? String(product.price) : match.price,
      });
    } else {
      unmatchedProducts.push(product.product);
    }
  }

  if (matchedItems.length === 0) {
    const errorMessage = `No products matched. Requested: ${parsed.products
      .map((p) => p.product)
      .join(", ")}`;

    const { data: log, error: logError } = await supabase
      .from("DraftOrderLog")
      .insert({
        customerName: parsed.name,
        customerEmail: parsed.email,
        parsedProducts: parsed.products,
        matchedVariants: [],
        status: "failed",
        errorMessage,
      })
      .select("id")
      .single();

    if (logError) {
      logger.error("Failed to insert draft order failure log", { error: logError.message });
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        parsed,
        logId: log?.id || null,
      },
      { status: 422 }
    );
  }

  let draftOrder;
  try {
    draftOrder = await createDraftOrder(parsed.email, parsed.name, matchedItems);
    const firstName = parsed.name.split(" ")[0] || parsed.name;
    await sendDraftOrderInvoice(draftOrder.id, parsed.email, firstName);
    await incrementUsage("draft_orders_created");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from("DraftOrderLog").insert({
      customerName: parsed.name,
      customerEmail: parsed.email,
      parsedProducts: parsed.products,
      matchedVariants: matchedItems,
      status: "failed",
      errorMessage: message,
    });
    return Response.json(
      { success: false, error: `Shopify call failed: ${message}` },
      { status: 502 }
    );
  }

  const { data: log, error: insertError } = await supabase
    .from("DraftOrderLog")
    .insert({
      shopifyDraftOrderId: String(draftOrder.id),
      customerName: parsed.name,
      customerEmail: parsed.email,
      parsedProducts: parsed.products,
      matchedVariants: matchedItems,
      status: "invoiced",
      errorMessage:
        unmatchedProducts.length > 0
          ? `Unmatched products: ${unmatchedProducts.join(", ")}`
          : null,
    })
    .select("id, shopifyDraftOrderId, customerName, customerEmail, status, errorMessage, createdAt")
    .single();

  if (insertError) {
    logger.error("Failed to insert draft order log", { error: insertError.message });
  }

  return Response.json(
    {
      success: true,
      draftOrderId: draftOrder.id,
      matchedCount: matchedItems.length,
      unmatchedProducts,
      log,
    },
    { status: 201 }
  );
}
