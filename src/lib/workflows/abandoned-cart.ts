import { supabase } from "@/lib/supabase";
import { fetchAbandonedCheckouts, checkIfOrderCompleted } from "@/lib/shopify/checkouts";
import { sendEmail } from "@/lib/email/sendgrid";
import { getTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

const STAGE_WAIT_DAYS: Record<number, number> = {
  0: 2,
  1: 3,
  2: 5,
};

const TEMPLATE_SLUGS: Record<number, string> = {
  1: "abandoned-cart-1",
  2: "abandoned-cart-2",
  3: "abandoned-cart-3",
};

interface AbandonedCartRow {
  id: string;
  shopifyCheckoutId: string;
  shopifyCheckoutToken: string | null;
  customerEmail: string;
  customerFirstName: string | null;
  abandonedCheckoutUrl: string;
  totalPrice: string | null;
  checkoutCreatedAt: string;
  timesContacted: number;
  lastContactedAt: string | null;
  currentStage: number;
  isRecovered: boolean;
  isCompleted: boolean;
}

export async function processAbandonedCart(): Promise<void> {
  const domain = process.env.SHOPIFY_DOMAIN!;
  const storeName = process.env.RESEND_FROM_NAME || domain.replace(".myshopify.com", "");
  const storeUrl = `https://${domain.replace(".myshopify.com", ".com")}`;
  const storeLogo = `${storeUrl}/cdn/shop/files/yomartez_logo.PNG?v=1615922940`;

  const checkouts = await fetchAbandonedCheckouts();

  for (const checkout of checkouts) {
    const email = checkout.customer?.email || checkout.email;
    if (!email) continue;

    const firstName =
      checkout.customer?.first_name ||
      checkout.billing_address?.first_name ||
      checkout.shipping_address?.first_name ||
      null;

    const lineItems = checkout.line_items.map((li) => ({
      title: li.title,
      variant: li.variant_title,
      quantity: li.quantity,
      price: li.price,
    }));

    const { error } = await supabase
      .from("AbandonedCartTracking")
      .upsert(
        {
          shopifyCheckoutId: String(checkout.id),
          shopifyCheckoutToken: checkout.token,
          customerEmail: email,
          customerFirstName: firstName,
          abandonedCheckoutUrl: checkout.abandoned_checkout_url,
          totalPrice: checkout.total_price,
          lineItems,
          checkoutCreatedAt: new Date(checkout.created_at).toISOString(),
        },
        { onConflict: "shopifyCheckoutId", ignoreDuplicates: true }
      );

    if (error) throw error;
  }

  const { data: pendingCartsRaw, error: pendingError } = await supabase
    .from("AbandonedCartTracking")
    .select("id, shopifyCheckoutId, shopifyCheckoutToken, customerEmail, customerFirstName, abandonedCheckoutUrl, totalPrice, checkoutCreatedAt, timesContacted, lastContactedAt, currentStage, isRecovered, isCompleted")
    .eq("isCompleted", false);

  if (pendingError) throw pendingError;

  const pendingCarts = (pendingCartsRaw || []) as AbandonedCartRow[];
  const now = new Date();
  let emailsSent = 0;

  for (const cart of pendingCarts) {
    const isRecovered = await checkIfOrderCompleted(
      cart.customerEmail,
      cart.shopifyCheckoutToken
    );

    if (isRecovered) {
      const { error } = await supabase
        .from("AbandonedCartTracking")
        .update({ isRecovered: true, isCompleted: true, updatedAt: now.toISOString() })
        .eq("id", cart.id);
      if (error) throw error;

      logger.info("Cart recovered", {
        checkoutId: cart.shopifyCheckoutId,
        email: cart.customerEmail,
      });
      continue;
    }

    const nextStage = cart.currentStage + 1;

    if (nextStage > 3) {
      const { error } = await supabase
        .from("AbandonedCartTracking")
        .update({ isCompleted: true, updatedAt: now.toISOString() })
        .eq("id", cart.id);
      if (error) throw error;
      continue;
    }

    const checkoutCreatedAt = new Date(cart.checkoutCreatedAt);

    if (cart.currentStage === 0) {
      const daysSinceCheckout = Math.floor(
        (now.getTime() - checkoutCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCheckout < STAGE_WAIT_DAYS[0]) continue;
    } else {
      if (!cart.lastContactedAt) continue;
      const daysSinceLastContact = Math.floor(
        (now.getTime() - new Date(cart.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const requiredWait = STAGE_WAIT_DAYS[cart.currentStage] || 5;
      if (daysSinceLastContact < requiredWait) continue;
    }

    const templateSlug = TEMPLATE_SLUGS[nextStage];
    if (!templateSlug) continue;

    try {
      const templateVars: Record<string, string> = {
        customer_first_name: cart.customerFirstName || "there",
        store_name: storeName,
        store_url: storeUrl,
        store_logo: storeLogo,
        checkout_url: cart.abandonedCheckoutUrl,
      };

      if (nextStage === 3) {
        templateVars.discount_code = "YO10";
        templateVars.discount_amount = "10%";
      }

      const { subject, html } = await getTemplate(templateSlug, templateVars);

      await sendEmail({ to: cart.customerEmail, subject, html });

      const { error } = await supabase
        .from("AbandonedCartTracking")
        .update({
          currentStage: nextStage,
          timesContacted: nextStage,
          lastContactedAt: now.toISOString(),
          updatedAt: now.toISOString(),
          ...(nextStage === 3 ? { isCompleted: true } : {}),
        })
        .eq("id", cart.id);
      if (error) throw error;

      emailsSent++;

      logger.info("Abandoned cart email sent", {
        stage: nextStage,
        email: cart.customerEmail,
        checkoutId: cart.shopifyCheckoutId,
      });
    } catch (error) {
      logger.error("Failed to send abandoned cart email", {
        stage: nextStage,
        email: cart.customerEmail,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Abandoned cart processing complete", {
    totalPending: pendingCarts.length,
    emailsSent,
  });
}
