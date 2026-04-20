import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { buildVipEmail } from "@/lib/email/automation-templates";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { fetchHighValueCustomers } from "@/lib/shopify/orders";
import { logger } from "@/lib/logger";

type VipTier = "mvp" | "all_star" | "legend";

function resolveTier(amountSpent: number): VipTier | null {
  if (amountSpent >= 2000) return "legend";
  if (amountSpent >= 1000) return "all_star";
  if (amountSpent >= 500) return "mvp";
  return null;
}

export async function processVipRecognition(): Promise<void> {
  const customers = await fetchHighValueCustomers();

  for (const customer of customers) {
    const tier = resolveTier(customer.amountSpent);
    if (!tier) continue;

    const alreadySent = await hasAutomationDispatch({
      automationKey: "vip_recognition",
      stageKey: tier,
      entityType: "customer",
      entityId: customer.email,
    });

    await upsertCustomerProfile({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      vipTier: tier,
      orderCount: customer.numberOfOrders,
      totalSpent: customer.amountSpent,
    });

    if (alreadySent) continue;

    const { subject, html } = buildVipEmail(tier, customer.firstName || "there");
    await sendEmail({ to: customer.email, subject, html });

    await recordAutomationDispatch({
      automationKey: "vip_recognition",
      stageKey: tier,
      entityType: "customer",
      entityId: customer.email,
      customerEmail: customer.email,
      customerName: customer.firstName,
      metadata: {
        amountSpent: customer.amountSpent,
        numberOfOrders: customer.numberOfOrders,
      },
    });

    const { error } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: "unknown",
      customerEmail: customer.email,
      customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || null,
      eventType: "vip_recognition",
      emailSent: tier,
      metadata: {
        amountSpent: customer.amountSpent,
        numberOfOrders: customer.numberOfOrders,
      },
    });
    if (error) throw error;
  }

  logger.info("VIP recognition automation processed", {
    customers: customers.length,
  });
}
