import { shopifyFetch } from "./client";
import { logger } from "@/lib/logger";
import type { ShopifyCheckout, ShopifyOrder } from "@/types/shopify";

export async function fetchAbandonedCheckouts(): Promise<ShopifyCheckout[]> {
  const response = await shopifyFetch<{ checkouts: ShopifyCheckout[] }>(
    "/checkouts.json?status=open&limit=250"
  );

  logger.info("Fetched abandoned checkouts", {
    count: response.checkouts.length,
  });

  return response.checkouts;
}

export async function checkIfOrderCompleted(
  customerEmail: string,
  checkoutToken?: string | null
): Promise<boolean> {
  if (checkoutToken) {
    try {
      const response = await shopifyFetch<{ orders: ShopifyOrder[] }>(
        `/orders.json?checkout_token=${checkoutToken}&status=any&limit=1`
      );
      if (response.orders.length > 0) {
        return true;
      }
    } catch {
      // Token lookup failed, fall through to email check
    }
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceDate = thirtyDaysAgo.toISOString();

    const response = await shopifyFetch<{ orders: ShopifyOrder[] }>(
      `/orders.json?email=${encodeURIComponent(customerEmail)}&created_at_min=${sinceDate}&status=any&limit=5`
    );

    return response.orders.length > 0;
  } catch (error) {
    logger.warn("Order completion check failed", {
      email: customerEmail,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
