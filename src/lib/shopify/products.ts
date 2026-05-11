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

interface ShopifyDashboardProduct {
  id: number;
  title: string;
  handle: string;
  status?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  images?: Array<{ src?: string | null }>;
  variants?: Array<{
    id: number;
    title: string;
    price: string;
    sku: string | null;
    inventory_quantity?: number | null;
    inventory_policy?: string | null;
    option1?: string | null;
    option2?: string | null;
    option3?: string | null;
  }>;
}

export interface ShopifyProductDashboardItem {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  publishedAt: string | null;
  image: string | null;
  productUrl: string;
  variantCount: number;
  totalInventory: number | null;
  minPrice: string | null;
  maxPrice: string | null;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    sku: string | null;
    inventoryQuantity: number | null;
    inventoryPolicy: string | null;
    options: string[];
  }>;
}

function productUrl(handle: string): string {
  return `https://yomartez.com/products/${handle}`;
}

function normalizeTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function mapDashboardProduct(
  product: ShopifyDashboardProduct
): ShopifyProductDashboardItem {
  const variants = product.variants || [];
  const prices = variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));
  const inventories = variants
    .map((variant) => variant.inventory_quantity)
    .filter((value): value is number => typeof value === "number");

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status || "unknown",
    vendor: product.vendor || null,
    productType: product.product_type || null,
    tags: normalizeTags(product.tags),
    createdAt: product.created_at || null,
    updatedAt: product.updated_at || null,
    publishedAt: product.published_at || null,
    image: product.images?.[0]?.src || null,
    productUrl: productUrl(product.handle),
    variantCount: variants.length,
    totalInventory:
      inventories.length > 0
        ? inventories.reduce((sum, value) => sum + value, 0)
        : null,
    minPrice: prices.length > 0 ? Math.min(...prices).toFixed(2) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices).toFixed(2) : null,
    variants: variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      sku: variant.sku,
      inventoryQuantity:
        typeof variant.inventory_quantity === "number"
          ? variant.inventory_quantity
          : null,
      inventoryPolicy: variant.inventory_policy || null,
      options: [variant.option1, variant.option2, variant.option3].filter(
        (option): option is string => Boolean(option)
      ),
    })),
  };
}

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

export async function fetchProductsForDashboard({
  query,
  status,
  limit = 100,
}: {
  query?: string | null;
  status?: string | null;
  limit?: number;
} = {}): Promise<ShopifyProductDashboardItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const params = new URLSearchParams({
    limit: String(safeLimit),
    order: "updated_at desc",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "vendor",
      "product_type",
      "tags",
      "created_at",
      "updated_at",
      "published_at",
      "images",
      "variants",
    ].join(","),
  });

  if (status && status !== "all") {
    params.set("status", status);
  }

  const response = await shopifyFetch<{ products: ShopifyDashboardProduct[] }>(
    `/products.json?${params.toString()}`
  );

  const products = response.products.map(mapDashboardProduct);
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    const haystack = [
      product.title,
      product.handle,
      product.vendor || "",
      product.productType || "",
      product.tags.join(" "),
      ...product.variants.flatMap((variant) => [
        variant.title,
        variant.sku || "",
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
