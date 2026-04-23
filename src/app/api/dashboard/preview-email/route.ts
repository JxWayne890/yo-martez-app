import { supabase } from "@/lib/supabase";
import { getTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

export const maxDuration = 15;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const email = searchParams.get("email");
  const cartId = searchParams.get("cartId");

  if (!slug) {
    return Response.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const domain = process.env.SHOPIFY_DOMAIN || "";
    const storeName =
      process.env.RESEND_FROM_NAME ||
      domain.replace(".myshopify.com", "") ||
      "Yo! Martez";
    const storeUrl = domain
      ? `https://${domain.replace(".myshopify.com", ".com")}`
      : "https://yomartez.com";
    const storeLogo = `${storeUrl}/cdn/shop/files/yomartez_logo.PNG?v=1615922940`;

    let firstName: string | null = null;
    let checkoutUrl: string | null = null;

    if (cartId) {
      const { data: cart } = await supabase
        .from("AbandonedCartTracking")
        .select("customerEmail, customerFirstName, abandonedCheckoutUrl")
        .eq("id", cartId)
        .maybeSingle();
      if (cart) {
        firstName = cart.customerFirstName;
        checkoutUrl = cart.abandonedCheckoutUrl;
      }
    }

    if (!firstName && email) {
      const { data: profile } = await supabase
        .from("CustomerProfile")
        .select("firstName")
        .eq("email", email)
        .maybeSingle();
      firstName = profile?.firstName ?? null;
    }

    const variables: Record<string, string> = {
      customer_first_name: firstName || "there",
      store_name: storeName,
      store_url: storeUrl,
      store_logo: storeLogo,
      checkout_url: checkoutUrl || storeUrl,
      discount_code: "YO10",
      discount_amount: "10%",
    };

    const { subject, html } = await getTemplate(slug, variables);

    return Response.json({
      slug,
      subject,
      html,
      to: email,
      from: `${storeName} <${process.env.RESEND_FROM_EMAIL || ""}>`,
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Email preview failed", { slug, error: detail });
    return Response.json(
      { error: "Failed to render preview", detail },
      { status: 500 }
    );
  }
}
