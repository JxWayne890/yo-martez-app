import { fetchOrders } from "@/lib/shopify/orders";
import { isShopifyConfigured } from "@/lib/shopify/client";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(request: Request) {
  if (!isShopifyConfigured()) {
    return Response.json(
      {
        error:
          "Shopify is not configured. Add SHOPIFY_DOMAIN and SHOPIFY_ADMIN_TOKEN.",
        code: "missing_shopify_env",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "100", 10) || 100,
    250
  );

  const params = new URLSearchParams({
    status: "any",
    limit: String(limit),
    fields: [
      "id",
      "name",
      "order_number",
      "email",
      "contact_email",
      "created_at",
      "updated_at",
      "financial_status",
      "fulfillment_status",
      "total_price",
      "subtotal_price",
      "total_tax",
      "total_discounts",
      "currency",
      "line_items",
      "customer",
      "source_name",
      "tags",
      "note",
      "cancelled_at",
      "refunds",
      "billing_address",
      "shipping_address",
    ].join(","),
  });

  if (filter === "unfulfilled") {
    params.set("fulfillment_status", "unfulfilled");
  } else if (filter === "fulfilled") {
    params.set("fulfillment_status", "fulfilled");
  } else if (filter === "unpaid") {
    params.set("financial_status", "pending");
  } else if (filter === "paid") {
    params.set("financial_status", "paid");
  }

  try {
    const orders = await fetchOrders(params);

    const mapped = orders.map((order) => {
      const o = order as typeof order & {
        name?: string;
        order_number?: number;
        currency?: string;
        source_name?: string;
        subtotal_price?: string | null;
        total_tax?: string | null;
        total_discounts?: string | null;
        tags?: string | null;
        note?: string | null;
        cancelled_at?: string | null;
        refunds?: Array<unknown>;
        billing_address?: {
          first_name?: string | null;
          last_name?: string | null;
          name?: string | null;
          city?: string | null;
          province?: string | null;
          country?: string | null;
          phone?: string | null;
        } | null;
        shipping_address?: {
          first_name?: string | null;
          last_name?: string | null;
          name?: string | null;
          city?: string | null;
          province?: string | null;
          country?: string | null;
          phone?: string | null;
        } | null;
      };
      const itemCount = (o.line_items || []).reduce(
        (sum, li) => sum + (li.quantity || 0),
        0
      );
      const fallbackName =
        o.billing_address?.name ||
        o.shipping_address?.name ||
        [
          o.billing_address?.first_name || o.shipping_address?.first_name,
          o.billing_address?.last_name || o.shipping_address?.last_name,
        ]
          .filter(Boolean)
          .join(" ");
      const fallbackFirstName =
        o.billing_address?.first_name ||
        o.shipping_address?.first_name ||
        (fallbackName ? fallbackName.split(" ")[0] : null);
      const fallbackLastName =
        o.billing_address?.last_name ||
        o.shipping_address?.last_name ||
        (fallbackName ? fallbackName.split(" ").slice(1).join(" ") : null);

      return {
        id: o.id,
        name: o.name || `#${o.order_number || o.id}`,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        customerEmail: o.customer?.email || o.contact_email || o.email || null,
        customerFirstName: o.customer?.first_name || fallbackFirstName || null,
        customerLastName: o.customer?.last_name || fallbackLastName || null,
        customerId: o.customer?.id || null,
        customerPhone:
          o.customer?.phone ||
          o.billing_address?.phone ||
          o.shipping_address?.phone ||
          null,
        total: o.total_price || null,
        subtotal: o.subtotal_price || null,
        tax: o.total_tax || null,
        discounts: o.total_discounts || null,
        currency: o.currency || "USD",
        financialStatus: o.financial_status || null,
        fulfillmentStatus: o.fulfillment_status || null,
        sourceName: o.source_name || null,
        tags: o.tags
          ? o.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
        note: o.note || null,
        cancelledAt: o.cancelled_at || null,
        refundCount: o.refunds?.length || 0,
        shipTo: o.shipping_address
          ? [
              o.shipping_address.city,
              o.shipping_address.province,
              o.shipping_address.country,
            ]
              .filter(Boolean)
              .join(", ") || null
          : o.billing_address
            ? [
                o.billing_address.city,
                o.billing_address.province,
                o.billing_address.country,
              ]
                .filter(Boolean)
                .join(", ") || null
          : null,
        itemCount,
        lineItems: (o.line_items || []).map((li) => ({
          title: li.title,
          variant: li.variant_title,
          quantity: li.quantity,
          price: li.price,
        })),
      };
    });

    const summary = mapped.reduce(
      (acc, order) => {
        const total = Number(order.total || 0);
        acc.totalRevenue += Number.isFinite(total) ? total : 0;
        acc.itemCount += order.itemCount;
        if (order.fulfillmentStatus === "fulfilled") acc.fulfilled += 1;
        if (order.financialStatus === "paid") acc.paid += 1;
        if (order.refundCount > 0) acc.withRefunds += 1;
        if (order.cancelledAt) acc.cancelled += 1;
        return acc;
      },
      {
        totalRevenue: 0,
        itemCount: 0,
        fulfilled: 0,
        paid: 0,
        withRefunds: 0,
        cancelled: 0,
      }
    );

    return Response.json({
      orders: mapped,
      count: mapped.length,
      filter,
      summary: {
        ...summary,
        totalRevenue: summary.totalRevenue.toFixed(2),
      },
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Orders fetch failed", { filter, error: detail });
    return Response.json(
      { error: "Failed to load orders", detail },
      { status: 500 }
    );
  }
}
