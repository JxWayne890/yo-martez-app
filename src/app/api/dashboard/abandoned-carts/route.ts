import { supabase } from "@/lib/supabase";
import { isShopifyConfigured } from "@/lib/shopify/client";
import { fetchAbandonedCheckoutsForDashboard } from "@/lib/shopify/checkouts";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const filter = searchParams.get("filter") || "all";
  const source = searchParams.get("source") || "tracking";

  if (source === "shopify") {
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

    try {
      const checkouts = await fetchAbandonedCheckoutsForDashboard({
        limit: Math.min(limit || 100, 250),
      });

      return Response.json({
        checkouts,
        count: checkouts.length,
        source,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Shopify abandoned checkouts fetch failed", {
        error: message,
      });
      return Response.json(
        { error: "Failed to load Shopify abandoned checkouts", detail: message },
        { status: 500 }
      );
    }
  }

  let query = supabase
    .from("AbandonedCartTracking")
    .select(
      "id, customerEmail, customerFirstName, totalPrice, lineItems, checkoutCreatedAt, timesContacted, lastContactedAt, currentStage, isRecovered, isCompleted, abandonedCheckoutUrl",
      { count: "exact" }
    );

  if (filter === "pending") {
    query = query.eq("isCompleted", false);
  } else if (filter === "recovered") {
    query = query.eq("isRecovered", true);
  } else if (filter === "completed") {
    query = query.eq("isCompleted", true).eq("isRecovered", false);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Abandoned carts error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }

  const total = count || 0;

  return Response.json({
    carts: data || [],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
