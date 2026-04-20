import Fuse from "fuse.js";
import { shopifyFetch } from "./client";
import { logger } from "@/lib/logger";
import type { ShopifyProduct } from "@/types/shopify";

const CACHE_TTL_MS = 15 * 60 * 1000;

interface ProductCatalogEntry {
  title: string;
  variantId: number;
  variantTitle: string;
  price: string;
  sku: string | null;
}

interface CatalogCache {
  catalog: ProductCatalogEntry[];
  expiresAt: number;
}

let cache: CatalogCache | null = null;

export async function fetchProductCatalog(): Promise<ProductCatalogEntry[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.catalog;
  }

  const response = await shopifyFetch<{ products: ShopifyProduct[] }>(
    "/products.json?fields=id,title,variants&limit=250"
  );

  const catalog: ProductCatalogEntry[] = [];

  for (const product of response.products) {
    for (const variant of product.variants) {
      catalog.push({
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        sku: variant.sku,
      });
    }
  }

  cache = { catalog, expiresAt: Date.now() + CACHE_TTL_MS };

  logger.info("Product catalog fetched and cached", {
    productCount: response.products.length,
    variantCount: catalog.length,
  });

  return catalog;
}

export function fuzzyMatchProduct(
  query: string,
  catalog: ProductCatalogEntry[]
): ProductCatalogEntry | null {
  const fuse = new Fuse(catalog, {
    keys: ["title", "variantTitle", "sku"],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return null;
  }

  const bestMatch = results.sort((a, b) => {
    const aExact = a.item.title.toLowerCase() === query.toLowerCase() ? 0 : 1;
    const bExact = b.item.title.toLowerCase() === query.toLowerCase() ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return (a.score || 1) - (b.score || 1);
  })[0];

  return bestMatch.item;
}
