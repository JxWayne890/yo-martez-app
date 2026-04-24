import { verifyWebhookHmac } from "@/lib/shopify/webhooks";
import { processCustomerWelcome } from "@/lib/workflows/customer-welcome";
import { processSubscriptionChange } from "@/lib/workflows/subscription-change";
import { processOrderReceived } from "@/lib/workflows/order-received";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
  const topic = request.headers.get("X-Shopify-Topic");

  if (!hmacHeader || !shopDomain || !topic) {
    return new Response("Missing headers", { status: 400 });
  }

  const expectedDomain = process.env.SHOPIFY_DOMAIN!;
  if (shopDomain !== expectedDomain) {
    logger.warn("Webhook for unexpected store", { shopDomain, topic });
    return new Response("OK", { status: 200 });
  }

  if (!verifyWebhookHmac(rawBody, hmacHeader, process.env.SHOPIFY_API_SECRET!)) {
    logger.warn("Invalid webhook HMAC", { shopDomain, topic });
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  try {
    switch (topic) {
      case "customers/create":
        await processCustomerWelcome(payload);
        break;
      case "customers/update":
        await processSubscriptionChange(payload);
        break;
      case "orders/create":
      case "orders/paid":
      case "orders/fulfilled":
        await processOrderReceived(payload);
        break;
      case "app/uninstalled":
        logger.info("App uninstalled webhook received", { shopDomain });
        break;
      default:
        logger.warn("Unhandled webhook topic", { topic, shopDomain });
    }
  } catch (error) {
    logger.error("Webhook processing failed", {
      topic,
      shopDomain,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Processing failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
