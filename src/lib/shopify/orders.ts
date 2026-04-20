import { shopifyFetch, shopifyFetchRaw, shopifyGraphqlFetch } from "@/lib/shopify/client";

export interface ShopifyOrderSummary {
  id: number;
  created_at: string;
  updated_at: string;
  contact_email: string | null;
  email?: string | null;
  checkout_token?: string | null;
  fulfillment_status: string | null;
  financial_status?: string | null;
  total_price?: string;
  line_items: Array<{
    title: string;
    variant_title: string | null;
    quantity: number;
    price: string;
  }>;
  customer?: {
    id: number;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    phone?: string | null;
  } | null;
}

interface OrdersResponse {
  orders: ShopifyOrderSummary[];
}

function parseLinkHeader(link: string | null): string | null {
  if (!link) return null;
  const parts = link.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      const url = new URL(match[1]);
      return url.searchParams.get("page_info");
    }
  }
  return null;
}

export async function fetchOrders(
  params: URLSearchParams
): Promise<ShopifyOrderSummary[]> {
  const response = await shopifyFetch<OrdersResponse>(
    `/orders.json?${params.toString()}`
  );
  return response.orders;
}

export async function fetchOrdersPaginated(
  params: URLSearchParams
): Promise<ShopifyOrderSummary[]> {
  const all: ShopifyOrderSummary[] = [];
  let pageInfo: string | null = null;

  do {
    const query = new URLSearchParams(pageInfo
      ? { limit: params.get("limit") || "250", page_info: pageInfo }
      : Object.fromEntries(params.entries()));

    const response = await shopifyFetchRaw(`/orders.json?${query.toString()}`);
    const body = (await response.json()) as OrdersResponse;
    all.push(...body.orders);
    pageInfo = parseLinkHeader(response.headers.get("link"));
  } while (pageInfo);

  return all;
}

export async function fetchOrdersByEmail(
  email: string
): Promise<ShopifyOrderSummary[]> {
  const params = new URLSearchParams({
    status: "any",
    email,
    limit: "25",
    fields: [
      "id",
      "email",
      "contact_email",
      "created_at",
      "updated_at",
      "checkout_token",
      "financial_status",
      "fulfillment_status",
      "total_price",
      "line_items",
      "customer",
    ].join(","),
  });

  return fetchOrders(params);
}

export async function hasOrderSince(
  email: string,
  since: Date
): Promise<boolean> {
  const params = new URLSearchParams({
    status: "any",
    email,
    created_at_min: since.toISOString(),
    limit: "1",
    fields: "id",
  });

  const orders = await fetchOrders(params);
  return orders.length > 0;
}

export async function fetchRecentOrdersForFollowup(
  createdAtMin: Date
): Promise<ShopifyOrderSummary[]> {
  const params = new URLSearchParams({
    status: "any",
    created_at_min: createdAtMin.toISOString(),
    limit: "250",
    fields: [
      "id",
      "created_at",
      "updated_at",
      "contact_email",
      "email",
      "fulfillment_status",
      "financial_status",
      "total_price",
      "line_items",
      "customer",
    ].join(","),
  });

  return fetchOrders(params);
}

export async function fetchRecentProducts(
  createdAtMin: Date,
  limit = 5
): Promise<Array<{ title: string; handle: string; image?: string | null }>> {
  const params = new URLSearchParams({
    created_at_min: createdAtMin.toISOString(),
    limit: String(limit),
    order: "created_at desc",
  });

  const response = await shopifyFetch<{
    products: Array<{
      title: string;
      handle: string;
      images?: Array<{ src: string }>;
    }>;
  }>(`/products.json?${params.toString()}`);

  return response.products.map((product) => ({
    title: product.title,
    handle: product.handle,
    image: product.images?.[0]?.src || null,
  }));
}

export async function findShopifyCustomerIdByEmail(
  email: string
): Promise<number | null> {
  const response = await shopifyFetch<{
    customers: Array<{ id: number }>;
  }>(`/customers/search.json?query=email:${encodeURIComponent(email)}`);

  return response.customers[0]?.id || null;
}

export async function upsertCustomerBirthdayMetafield(
  customerId: number,
  birthdayIso: string
): Promise<void> {
  await shopifyFetch(
    `/customers/${customerId}/metafields.json`,
    {
      method: "POST",
      body: JSON.stringify({
        metafield: {
          namespace: "facts",
          key: "birth_date",
          type: "date",
          value: birthdayIso,
        },
      }),
    }
  );
}

export async function fetchHighValueCustomers(): Promise<
  Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    amountSpent: number;
    numberOfOrders: number;
  }>
> {
  const query = `
    query CustomersHighSpend($first: Int!) {
      customerSegmentMembers(first: $first, query: "amount_spent >= 500") {
        edges {
          node {
            firstName
            lastName
            numberOfOrders
            amountSpent {
              amount
            }
            defaultEmailAddress {
              emailAddress
            }
          }
        }
      }
    }
  `;

  const response = await shopifyGraphqlFetch<{
    data?: {
      customerSegmentMembers?: {
        edges?: Array<{
          node?: {
            firstName?: string | null;
            lastName?: string | null;
            numberOfOrders?: number;
            amountSpent?: { amount?: string | number | null };
            defaultEmailAddress?: { emailAddress?: string | null };
          };
        }>;
      };
    };
  }>(query, { first: 250 });

  const edges = response.data?.customerSegmentMembers?.edges || [];

  return edges
    .map((edge) => {
      const node = edge.node;
      const email = node?.defaultEmailAddress?.emailAddress || null;
      if (!email) return null;

      return {
        email,
        firstName: node?.firstName || null,
        lastName: node?.lastName || null,
        amountSpent: Number(node?.amountSpent?.amount || 0),
        numberOfOrders: Number(node?.numberOfOrders || 0),
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}
