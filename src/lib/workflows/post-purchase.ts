import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { buildPostPurchaseEmail } from "@/lib/email/automation-templates";
import { fetchRecentOrdersForFollowup } from "@/lib/shopify/orders";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

const STAGES = [2, 5, 7, 14, 21, 30] as const;

export async function processPostPurchaseFollowups(): Promise<void> {
  const since = new Date();
  since.setDate(since.getDate() - 35);

  const orders = await fetchRecentOrdersForFollowup(since);
  const now = new Date();

  for (const order of orders) {
    const email = order.contact_email || order.email || order.customer?.email;
    if (!email || order.fulfillment_status !== "fulfilled") continue;

    const titles = order.line_items.map((item) => item.title).join(", ");
    if (titles.toLowerCase().includes("haircut")) continue;

    const createdAt = new Date(order.created_at);
    const daysSince = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const stage = STAGES.find((value) => value === daysSince);
    if (!stage) continue;

    const stageKey = `day_${stage}`;
    const entityId = String(order.id);
    const alreadySent = await hasAutomationDispatch({
      automationKey: "post_purchase",
      stageKey,
      entityType: "order",
      entityId,
    });

    if (alreadySent) continue;

    const firstName = order.customer?.first_name || "there";
    const { subject, html } = buildPostPurchaseEmail(stage, firstName);

    await sendEmail({ to: email, subject, html });

    await recordAutomationDispatch({
      automationKey: "post_purchase",
      stageKey,
      entityType: "order",
      entityId,
      customerEmail: email,
      customerName: firstName,
      metadata: {
        orderId: order.id,
        lineItems: titles,
      },
    });

    await upsertCustomerProfile({
      email,
      shopifyCustomerId: order.customer?.id ? String(order.customer.id) : null,
      firstName: order.customer?.first_name || null,
      lastName: order.customer?.last_name || null,
      phone: order.customer?.phone || null,
      lastOrderAt: createdAt,
    });

    const { error: logError } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: order.customer?.id ? String(order.customer.id) : "unknown",
      customerEmail: email,
      customerName: `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim() || null,
      eventType: "post_purchase_followup",
      emailSent: stageKey,
      metadata: {
        orderId: order.id,
        daysSince,
      },
    });
    if (logError) throw logError;
  }

  logger.info("Post-purchase automation processed", {
    orders: orders.length,
  });
}
