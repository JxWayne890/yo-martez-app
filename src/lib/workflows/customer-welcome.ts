import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { getTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import type { ShopifyCustomer } from "@/types/shopify";

export async function processCustomerWelcome(
  payload: Record<string, unknown>
): Promise<void> {
  const customer = payload as unknown as ShopifyCustomer;

  const isSubscribed = customer.email_marketing_consent?.state === "subscribed";

  if (!isSubscribed) {
    logger.info("Customer not subscribed, skipping welcome email", {
      customerId: customer.id,
    });
    return;
  }

  if (!customer.email) {
    logger.warn("Customer has no email, skipping", {
      customerId: customer.id,
    });
    return;
  }

  const domain = process.env.SHOPIFY_DOMAIN!;
  const storeName = process.env.RESEND_FROM_NAME || domain.replace(".myshopify.com", "");
  const storeUrl = `https://${domain.replace(".myshopify.com", ".com")}`;

  const { subject, html } = await getTemplate("welcome", {
    customer_first_name: customer.first_name || "there",
    store_name: storeName,
    store_url: storeUrl,
    store_logo: `${storeUrl}/cdn/shop/files/yomartez_logo.PNG?v=1615922940`,
  });

  await sendEmail({ to: customer.email, subject, html });

  await upsertCustomerProfile({
    email: customer.email,
    shopifyCustomerId: String(customer.id),
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    marketingState: customer.email_marketing_consent?.state || null,
  });

  const { error } = await supabase.from("CustomerEventLog").insert({
    shopifyCustomerId: String(customer.id),
    customerEmail: customer.email,
    customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || null,
    eventType: "customer_created",
    emailSent: "welcome",
    metadata: {
      subscriptionState: customer.email_marketing_consent?.state,
      createdAt: customer.created_at,
    },
  });

  if (error) throw error;

  logger.info("Welcome email sent", {
    customerId: customer.id,
    email: customer.email,
  });
}
