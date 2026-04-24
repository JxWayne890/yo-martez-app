import { fetchOrders } from "@/lib/shopify/orders";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(request: Request) {
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
      "currency",
      "line_items",
      "customer",
      "source_name",
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
      };
      const itemCount = (o.line_items || []).reduce(
        (sum, li) => sum + (li.quantity || 0),
        0
      );
      return {
        id: o.id,
        name: o.name || `#${o.order_number || o.id}`,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        customerEmail: o.customer?.email || o.contact_email || o.email || null,
        customerFirstName: o.customer?.first_name || null,
        customerLastName: o.customer?.last_name || null,
        customerId: o.customer?.id || null,
        total: o.total_price || null,
        currency: o.currency || "USD",
        financialStatus: o.financial_status || null,
        fulfillmentStatus: o.fulfillment_status || null,
        sourceName: o.source_name || null,
        itemCount,
        lineItems: (o.line_items || []).map((li) => ({
          title: li.title,
          variant: li.variant_title,
          quantity: li.quantity,
          price: li.price,
        })),
      };
    });

    return Response.json({
      orders: mapped,
      count: mapped.length,
      filter,
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
