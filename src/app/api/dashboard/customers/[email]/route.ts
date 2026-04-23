import { supabase } from "@/lib/supabase";
import { fetchOrdersByEmail } from "@/lib/shopify/orders";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).trim().toLowerCase();

  try {
    const [
      profileResult,
      eventsResult,
      cartsResult,
    ] = await Promise.all([
      supabase
        .from("CustomerProfile")
        .select("*")
        .eq("email", email)
        .maybeSingle(),
      supabase
        .from("CustomerEventLog")
        .select("id, eventType, emailSent, metadata, createdAt")
        .eq("customerEmail", email)
        .order("createdAt", { ascending: false }),
      supabase
        .from("AbandonedCartTracking")
        .select("id, shopifyCheckoutId, abandonedCheckoutUrl, totalPrice, lineItems, checkoutCreatedAt, timesContacted, lastContactedAt, currentStage, isRecovered, isCompleted")
        .eq("customerEmail", email)
        .order("checkoutCreatedAt", { ascending: false }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (eventsResult.error) throw eventsResult.error;
    if (cartsResult.error) throw cartsResult.error;

    const profile = profileResult.data;
    const events = eventsResult.data || [];
    const abandonedCarts = cartsResult.data || [];

    let orders: Array<{
      id: number;
      createdAt: string;
      total: string | null;
      financialStatus: string | null;
      fulfillmentStatus: string | null;
      lineItems: Array<{
        title: string;
        variant: string | null;
        quantity: number;
        price: string;
      }>;
    }> = [];

    try {
      const shopifyOrders = await fetchOrdersByEmail(email);
      orders = shopifyOrders.map((order) => ({
        id: order.id,
        createdAt: order.created_at,
        total: order.total_price || null,
        financialStatus: order.financial_status || null,
        fulfillmentStatus: order.fulfillment_status || null,
        lineItems: (order.line_items || []).map((li) => ({
          title: li.title,
          variant: li.variant_title,
          quantity: li.quantity,
          price: li.price,
        })),
      }));
    } catch (err) {
      logger.warn("Failed to fetch Shopify orders for customer profile", {
        email,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const emailsSent = events
      .filter((e) => e.emailSent)
      .map((e) => ({
        template: e.emailSent!,
        eventType: e.eventType,
        sentAt: e.createdAt,
      }));

    const lastEmailSent = emailsSent[0] || null;

    const campaignsReceived = Array.from(
      new Set(emailsSent.map((e) => e.template))
    ).sort();

    return Response.json({
      email,
      profile,
      stats: {
        totalOrders: orders.length,
        totalSpent: orders.reduce(
          (sum, o) => sum + (parseFloat(o.total || "0") || 0),
          0
        ),
        totalEvents: events.length,
        totalEmailsReceived: emailsSent.length,
        abandonedCartCount: abandonedCarts.length,
        recoveredCartCount: abandonedCarts.filter((c) => c.isRecovered).length,
      },
      orders,
      abandonedCarts,
      events,
      emailsSent,
      lastEmailSent,
      campaignsReceived,
    });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("Customer profile fetch failed", { email, error: detail });
    return Response.json(
      { error: "Failed to load customer profile", detail },
      { status: 500 }
    );
  }
}
