import { supabase } from "@/lib/supabase";
import { parseOrderFromMessage } from "@/lib/ai/gemini";
import { fetchProductCatalog, fuzzyMatchProduct } from "@/lib/shopify/products";
import { createDraftOrder, sendDraftOrderInvoice } from "@/lib/shopify/draft-orders";
import { logger } from "@/lib/logger";
import type { MatchedLineItem } from "@/types/workflows";

export async function processSlackDraftOrder(
  payload: Record<string, unknown>
): Promise<void> {
  const messageText = payload.messageText as string;
  const slackChannel = payload.slackChannel as string | undefined;
  const slackTs = payload.slackTs as string | undefined;

  if (!messageText) {
    logger.warn("No message text in Slack draft order payload");
    return;
  }

  const parsed = await parseOrderFromMessage(messageText);
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
    const { data: log, error } = await supabase
      .from("DraftOrderLog")
      .insert({
        customerName: parsed.name,
        customerEmail: parsed.email,
        parsedProducts: parsed.products,
        matchedVariants: [],
        status: "failed",
        errorMessage: `No products matched. Requested: ${parsed.products.map((p) => p.product).join(", ")}`,
        slackChannelId: slackChannel || null,
        slackMessageTs: slackTs || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    logger.error("No products matched for draft order", {
      logId: log.id,
      requestedProducts: parsed.products.map((p) => p.product),
    });
    return;
  }

  const draftOrder = await createDraftOrder(
    parsed.email,
    parsed.name,
    matchedItems
  );

  const firstName = parsed.name.split(" ")[0] || parsed.name;
  await sendDraftOrderInvoice(draftOrder.id, parsed.email, firstName);

  const { error } = await supabase.from("DraftOrderLog").insert({
    shopifyDraftOrderId: String(draftOrder.id),
    customerName: parsed.name,
    customerEmail: parsed.email,
    parsedProducts: parsed.products,
    matchedVariants: matchedItems,
    status: "invoiced",
    slackChannelId: slackChannel || null,
    slackMessageTs: slackTs || null,
    errorMessage: unmatchedProducts.length > 0
      ? `Unmatched products: ${unmatchedProducts.join(", ")}`
      : null,
  });

  if (error) throw error;

  logger.info("Slack draft order completed", {
    draftOrderId: draftOrder.id,
    matchedCount: matchedItems.length,
    unmatchedCount: unmatchedProducts.length,
  });
}
