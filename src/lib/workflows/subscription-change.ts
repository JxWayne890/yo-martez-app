import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { getTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import type { ShopifyCustomer } from "@/types/shopify";

export async function processSubscriptionChange(
  payload: Record<string, unknown>
): Promise<void> {
  const customer = payload as unknown as ShopifyCustomer;

  if (!customer.email) {
    logger.warn("Customer has no email, skipping subscription change", {
      customerId: customer.id,
    });
    return;
  }

  const currentState = customer.email_marketing_consent?.state || "not_subscribed";

  const { data: existing, error: findError } = await supabase
    .from("CustomerProfile")
    .select("marketingState")
    .eq("email", customer.email)
    .maybeSingle();

  if (findError) throw findError;

  if (existing && existing.marketingState === currentState) {
    logger.info("Subscription state unchanged, skipping", {
      customerId: customer.id,
      state: currentState,
    });
    return;
  }

  const domain = process.env.SHOPIFY_DOMAIN!;
  const storeName = process.env.RESEND_FROM_NAME || domain.replace(".myshopify.com", "");
  const storeUrl = `https://${domain.replace(".myshopify.com", ".com")}`;

  const templateVars = {
    customer_first_name: customer.first_name || "there",
    store_name: storeName,
    store_url: storeUrl,
    store_logo: `${storeUrl}/cdn/shop/files/yomartez_logo.PNG?v=1615922940`,
  };

  if (currentState === "subscribed") {
    const { subject, html } = await getTemplate("welcome", templateVars);
    await sendEmail({ to: customer.email, subject, html });

    const { error } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: String(customer.id),
      customerEmail: customer.email,
      customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || null,
      eventType: "subscribed",
      emailSent: "welcome",
      metadata: { consentUpdatedAt: customer.email_marketing_consent?.consent_updated_at },
    });
    if (error) throw error;

    logger.info("Subscription welcome email sent", { customerId: customer.id });
  } else if (currentState === "unsubscribed") {
    const { subject, html } = await getTemplate("farewell", templateVars);
    await sendEmail({ to: customer.email, subject, html });

    const { error } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: String(customer.id),
      customerEmail: customer.email,
      customerName: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || null,
      eventType: "unsubscribed",
      emailSent: "farewell",
      metadata: { consentUpdatedAt: customer.email_marketing_consent?.consent_updated_at },
    });
    if (error) throw error;

    logger.info("Farewell email sent", { customerId: customer.id });
  } else {
    logger.info("Subscription state not actionable", {
      customerId: customer.id,
      state: currentState,
    });
  }

  await upsertCustomerProfile({
    email: customer.email,
    shopifyCustomerId: String(customer.id),
    firstName: customer.first_name,
    lastName: customer.last_name,
    phone: customer.phone,
    marketingState: currentState,
  });
}
