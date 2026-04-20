import { shopifyFetch } from "./client";
import { logger } from "@/lib/logger";
import type { ShopifyDraftOrder } from "@/types/shopify";
import type { MatchedLineItem } from "@/types/workflows";

export async function createDraftOrder(
  customerEmail: string,
  customerName: string,
  lineItems: MatchedLineItem[]
): Promise<ShopifyDraftOrder> {
  const response = await shopifyFetch<{ draft_order: ShopifyDraftOrder }>(
    "/draft_orders.json",
    {
      method: "POST",
      body: JSON.stringify({
        draft_order: {
          email: customerEmail,
          note: `Customer: ${customerName}`,
          line_items: lineItems.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        },
      }),
    }
  );

  logger.info("Draft order created", {
    draftOrderId: response.draft_order.id,
    email: customerEmail,
  });

  return response.draft_order;
}

export async function sendDraftOrderInvoice(
  draftOrderId: number,
  customerEmail: string,
  customerFirstName: string
): Promise<void> {
  await shopifyFetch(
    `/draft_orders/${draftOrderId}/send_invoice.json`,
    {
      method: "POST",
      body: JSON.stringify({
        draft_order_invoice: {
          to: customerEmail,
          subject: "Yo! Invoice",
          custom_message: `${customerFirstName}, we got you squared away, now you're one step closer to gaining full access as a VIP community member.`,
        },
      }),
    }
  );

  logger.info("Draft order invoice sent", {
    draftOrderId,
    email: customerEmail,
  });
}
