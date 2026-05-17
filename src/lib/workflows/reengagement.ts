import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import {
  buildReengagementEmail,
  buildReengagementProductGrid,
} from "@/lib/email/automation-templates";
import {
  fetchOrdersPaginated,
  fetchRecentProducts,
  type ShopifyOrderSummary,
} from "@/lib/shopify/orders";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

// TODO: read from EmailTemplate for UI-editable copy
const STAGES = [45, 60, 75, 90] as const;
type Stage = (typeof STAGES)[number];

function getEmail(order: ShopifyOrderSummary): string | null {
  return order.customer?.email || order.contact_email || order.email || null;
}

export async function processReengagementCampaigns(): Promise<void> {
  const now = new Date();
  const createdAtMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const createdAtMax = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    status: "any",
    created_at_min: createdAtMin.toISOString(),
    created_at_max: createdAtMax.toISOString(),
    limit: "250",
    fields: [
      "id",
      "customer",
      "created_at",
      "updated_at",
      "fulfillment_status",
      "financial_status",
      "line_items",
    ].join(","),
  });

  const orders = await fetchOrdersPaginated(params);
  const ordersByEmail = new Map<string, ShopifyOrderSummary[]>();

  for (const order of orders) {
    const email = getEmail(order);
    if (!email) continue;

    const existing = ordersByEmail.get(email) || [];
    existing.push(order);
    ordersByEmail.set(email, existing);
  }

  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const recentProducts = await fetchRecentProducts(sixtyDaysAgo, 5);
  const productRows = buildReengagementProductGrid(recentProducts);

  for (const [email, customerOrders] of ordersByEmail.entries()) {
    if (customerOrders.length !== 1) continue;

    const order = customerOrders[0];
    const firstLineItem = order.line_items[0];
    if (firstLineItem && firstLineItem.title === "Haircut") continue;

    const daysSince = Math.floor(
      (now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const stage = STAGES.find((value) => value === daysSince);
    if (!stage) continue;

    const stageKey = `day_${stage}`;
    const alreadySent = await hasAutomationDispatch({
      automationKey: "reengagement",
      stageKey,
      entityType: "customer",
      entityId: email,
    });

    if (alreadySent) continue;

    const firstName = order.customer?.first_name || "there";
    const rowsForStage = stage === 60 ? productRows : "";
    const { subject, html } = buildReengagementEmail(stage as Stage, firstName, rowsForStage);

    await sendEmail({ to: email, subject, html });

    await recordAutomationDispatch({
      automationKey: "reengagement",
      stageKey,
      entityType: "customer",
      entityId: email,
      customerEmail: email,
      customerName: firstName,
      metadata: {
        orderId: order.id,
        daysSince,
      },
    });

    await upsertCustomerProfile({
      email,
      shopifyCustomerId: order.customer?.id ? String(order.customer.id) : null,
      firstName: order.customer?.first_name || null,
      lastName: order.customer?.last_name || null,
      phone: order.customer?.phone || null,
      orderCount: customerOrders.length,
      lastOrderAt: new Date(order.created_at),
    });

    const { error } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: order.customer?.id ? String(order.customer.id) : "unknown",
      customerEmail: email,
      customerName: `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || null,
      eventType: "reengagement",
      emailSent: stageKey,
      metadata: {
        orderId: order.id,
        daysSince,
      },
    });
    if (error) throw error;
  }

  logger.info("Re-engagement automation processed", {
    orders: orders.length,
  });
}
