import { logger } from "@/lib/logger";

const API_VERSION = "2024-01";

function getDomain(): string {
  return process.env.SHOPIFY_DOMAIN!;
}

function getAccessToken(): string {
  return process.env.SHOPIFY_ADMIN_TOKEN!;
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
