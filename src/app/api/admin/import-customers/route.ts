import { shopifyFetchRaw } from "@/lib/shopify/client";
import { supabase } from "@/lib/supabase";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  orders_count: number;
  total_spent: string;
  email_marketing_consent?: { state?: string | null } | null;
  last_order_id: number | null;
  updated_at: string;
  created_at: string;
}

function extractNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/page_info=([^&>]+)[^>]*>;\s*rel="next"/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pageInfo: string | null = null;
  let totalFetched = 0;
  let profilesCreated = 0;
  let profilesUpdated = 0;
  let eventsLogged = 0;
  const errors: { email: string; detail: unknown }[] = [];

  try {
    while (true) {
      const endpoint = pageInfo
        ? `/customers.json?limit=250&page_info=${pageInfo}`
        : `/customers.json?limit=250`;

      const response = await shopifyFetchRaw(endpoint);
      const data = (await response.json()) as { customers: ShopifyCustomer[] };
      const customers = data.customers || [];
      totalFetched += customers.length;

      await Promise.all(
        customers.map(async (customer) => {
          const email = customer.email?.trim().toLowerCase();
          if (!email) return;

          try {
            const { data: existing } = await supabase
              .from("CustomerProfile")
              .select("id")
              .eq("email", email)
              .maybeSingle();

            await upsertCustomerProfile({
              email,
              shopifyCustomerId: String(customer.id),
              firstName: customer.first_name,
              lastName: customer.last_name,
              phone: customer.phone,
              marketingState: customer.email_marketing_consent?.state ?? null,
              orderCount: customer.orders_count,
              totalSpent: parseFloat(customer.total_spent) || 0,
            });

            if (existing) {
              profilesUpdated++;
            } else {
              profilesCreated++;
              const { error: logError } = await supabase
                .from("CustomerEventLog")
                .insert({
                  shopifyCustomerId: String(customer.id),
                  customerEmail: email,
                  customerName:
                    `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                    null,
                  eventType: "customer_imported",
                  emailSent: null,
                  metadata: {
                    ordersCount: customer.orders_count,
                    totalSpent: customer.total_spent,
                    shopifyCreatedAt: customer.created_at,
                  },
                });
              if (!logError) eventsLogged++;
            }
          } catch (error) {
            errors.push({
              email,
              detail:
                error && typeof error === "object"
                  ? JSON.parse(
                      JSON.stringify(error, Object.getOwnPropertyNames(error))
                    )
                  : String(error),
            });
          }
        })
      );

      const next = extractNextPageInfo(response.headers.get("Link"));
      if (!next) break;
      pageInfo = next;
    }

    logger.info("Customer import complete", {
      totalFetched,
      profilesCreated,
      profilesUpdated,
      eventsLogged,
      errorCount: errors.length,
    });

    return Response.json({
      success: true,
      totalFetched,
      profilesCreated,
      profilesUpdated,
      eventsLogged,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Customer import failed", {
      error: detail,
      totalFetched,
      profilesCreated,
      profilesUpdated,
    });
    return Response.json(
      {
        error: "Import failed",
        detail,
        totalFetched,
        profilesCreated,
        profilesUpdated,
      },
      { status: 500 }
    );
  }
}
