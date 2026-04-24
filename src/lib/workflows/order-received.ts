import { supabase } from "@/lib/supabase";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

interface ShopifyOrderWebhookPayload {
  id: number;
  email?: string | null;
  contact_email?: string | null;
  total_price?: string | null;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  created_at: string;
  source_name?: string | null;
  customer?: {
    id?: number | null;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    orders_count?: number | null;
    total_spent?: string | null;
  } | null;
  line_items?: Array<{
    title: string;
    variant_title: string | null;
    quantity: number;
    price: string;
  }>;
}

export async function processOrderReceived(
  payload: ShopifyOrderWebhookPayload
): Promise<void> {
  const email = (
    payload.customer?.email ||
    payload.email ||
    payload.contact_email ||
    ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    logger.info("Skipping order webhook with no email", { orderId: payload.id });
    return;
  }

  const firstName = payload.customer?.first_name || null;
  const lastName = payload.customer?.last_name || null;
  const shopifyCustomerId = payload.customer?.id
    ? String(payload.customer.id)
    : null;

  if (shopifyCustomerId) {
    await upsertCustomerProfile({
      email,
      shopifyCustomerId,
      firstName,
      lastName,
      phone: payload.customer?.phone || null,
      orderCount: payload.customer?.orders_count ?? undefined,
      totalSpent:
        payload.customer?.total_spent !== undefined &&
        payload.customer?.total_spent !== null
          ? parseFloat(payload.customer.total_spent)
          : undefined,
      lastOrderAt: new Date(payload.created_at),
    });
  }

  const customerName =
    `${firstName || ""} ${lastName || ""}`.trim() || null;

  const { error } = await supabase.from("CustomerEventLog").insert({
    shopifyCustomerId: shopifyCustomerId || "unknown",
    customerEmail: email,
    customerName,
    eventType: "order_placed",
    emailSent: null,
    metadata: {
      orderId: payload.id,
      totalPrice: payload.total_price,
      financialStatus: payload.financial_status,
      fulfillmentStatus: payload.fulfillment_status,
      sourceName: payload.source_name,
      itemCount: payload.line_items?.length ?? 0,
      lineItems: payload.line_items ?? [],
    },
  });

  if (error) {
    logger.warn("Failed to log order event", {
      orderId: payload.id,
      error: error.message,
    });
  }

  logger.info("Order webhook processed", {
    orderId: payload.id,
    email,
    total: payload.total_price,
  });
}
