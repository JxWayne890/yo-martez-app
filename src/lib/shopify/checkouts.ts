import { shopifyFetch } from "./client";
import { logger } from "@/lib/logger";
import type { ShopifyCheckout, ShopifyOrder } from "@/types/shopify";

export interface ShopifyCheckoutDashboardItem {
  id: number;
  token: string | null;
  email: string | null;
  customerName: string | null;
  customerId: number | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  province: string | null;
  totalPrice: string | null;
  currency: string;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  abandonedCheckoutUrl: string | null;
  recoveryStatus: "recovered" | "closed" | "not_recovered";
  lineItemCount: number;
  lineItems: Array<{
    title: string;
    variant: string | null;
    quantity: number;
    price: string | null;
  }>;
}

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

export async function fetchAbandonedCheckoutsForDashboard({
  limit = 100,
}: {
  limit?: number;
} = {}): Promise<ShopifyCheckoutDashboardItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const params = new URLSearchParams({
    status: "abandoned",
    limit: String(safeLimit),
    fields: [
      "id",
      "token",
      "email",
      "created_at",
      "updated_at",
      "completed_at",
      "closed_at",
      "abandoned_checkout_url",
      "total_price",
      "currency",
      "customer",
      "billing_address",
      "shipping_address",
      "line_items",
    ].join(","),
  });

  const response = await shopifyFetch<{
    checkouts: Array<
      ShopifyCheckout & {
        completed_at?: string | null;
        closed_at?: string | null;
        currency?: string | null;
        billing_address?: ShopifyCheckout["billing_address"] & {
          country?: string | null;
          province?: string | null;
        };
        shipping_address?: ShopifyCheckout["shipping_address"] & {
          country?: string | null;
          province?: string | null;
        };
      }
    >;
  }>(`/checkouts.json?${params.toString()}`);

  return response.checkouts.map((checkout) => {
    const customerName = [
      checkout.customer?.first_name ||
        checkout.shipping_address?.first_name ||
        checkout.billing_address?.first_name ||
        "",
      checkout.customer?.last_name ||
        checkout.shipping_address?.last_name ||
        checkout.billing_address?.last_name ||
        "",
    ]
      .join(" ")
      .trim();
    const country =
      checkout.shipping_address?.country ||
      checkout.billing_address?.country ||
      null;
    const province =
      checkout.shipping_address?.province ||
      checkout.billing_address?.province ||
      null;

    return {
      id: checkout.id,
      token: checkout.token || null,
      email: checkout.customer?.email || checkout.email || null,
      customerName: customerName || null,
      customerId: checkout.customer?.id || null,
      phone:
        checkout.customer?.phone ||
        checkout.shipping_address?.phone ||
        checkout.billing_address?.phone ||
        null,
      region: [province, country].filter(Boolean).join(", ") || null,
      country,
      province,
      totalPrice: checkout.total_price || null,
      currency: checkout.currency || "USD",
      createdAt: checkout.created_at || null,
      updatedAt: checkout.updated_at || null,
      completedAt: checkout.completed_at || null,
      closedAt: checkout.closed_at || null,
      abandonedCheckoutUrl: checkout.abandoned_checkout_url || null,
      recoveryStatus: checkout.completed_at
        ? "recovered"
        : checkout.closed_at
          ? "closed"
          : "not_recovered",
      lineItemCount: (checkout.line_items || []).reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      ),
      lineItems: (checkout.line_items || []).map((item) => ({
        title: item.title,
        variant: item.variant_title,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  });
}
