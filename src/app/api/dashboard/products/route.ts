import { isShopifyConfigured } from "@/lib/shopify/client";
import { fetchProductsForDashboard } from "@/lib/shopify/products";
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
  const status = searchParams.get("status") || "all";
  const query = searchParams.get("query") || "";
  const limit = Math.min(
    parseInt(searchParams.get("limit") || "100", 10) || 100,
    250
  );

  try {
    const products = await fetchProductsForDashboard({
      status,
      query,
      limit,
    });

    return Response.json({
      products,
      count: products.length,
      status,
      query,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Products fetch failed", { status, query, error: message });
    return Response.json(
      { error: "Failed to load products", detail: message },
      { status: 500 }
    );
  }
}
