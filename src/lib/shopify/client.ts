import { logger } from "@/lib/logger";

const API_VERSION = "2024-01";

export function isShopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN);
}

function getDomain(): string {
  const domain = process.env.SHOPIFY_DOMAIN;
  if (!domain) {
    throw new Error("Missing SHOPIFY_DOMAIN environment variable.");
  }
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getAccessToken(): string {
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) {
    throw new Error("Missing SHOPIFY_ADMIN_TOKEN environment variable.");
  }
  return token;
}

export async function shopifyFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://${getDomain()}/admin/api/${API_VERSION}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": getAccessToken(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Shopify API error", {
      endpoint,
      status: response.status,
      body,
    });
    throw new Error(`Shopify API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export async function shopifyFetchRaw(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://${getDomain()}/admin/api/${API_VERSION}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Shopify-Access-Token": getAccessToken(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Shopify API error", {
      endpoint,
      status: response.status,
      body,
    });
    throw new Error(`Shopify API error ${response.status}: ${body}`);
  }

  return response;
}

export async function shopifyGraphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  return shopifyFetch<T>("/graphql.json", {
    method: "POST",
    body: JSON.stringify({
      query,
      variables,
    }),
  });
}
