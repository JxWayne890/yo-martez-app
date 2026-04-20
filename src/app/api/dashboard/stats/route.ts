import { supabase } from "@/lib/supabase";

async function countAll(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

async function countBool(
  table: string,
  column: string,
  value: boolean
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);
  if (error) throw error;
  return count || 0;
}

export async function GET() {
  try {
    const [
      totalCampaigns,
      totalCustomerEvents,
      totalAbandonedCarts,
      recoveredCarts,
      totalDraftOrders,
      totalProfiles,
      totalAccessRequests,
      totalAutomationDispatches,
      pendingCarts,
    ] = await Promise.all([
      countAll("EmailTemplate"),
      countAll("CustomerEventLog"),
      countAll("AbandonedCartTracking"),
      countBool("AbandonedCartTracking", "isRecovered", true),
      countAll("DraftOrderLog"),
      countAll("CustomerProfile"),
      countAll("AccessRequest"),
      countAll("AutomationDispatch"),
      countBool("AbandonedCartTracking", "isCompleted", false),
    ]);

    const { data: recentEvents, error } = await supabase
      .from("CustomerEventLog")
      .select("id, customerEmail, customerName, eventType, emailSent, createdAt")
      .order("createdAt", { ascending: false })
      .limit(10);

    if (error) throw error;

    return Response.json({
      store: {
        domain: process.env.SHOPIFY_DOMAIN || null,
      },
      stats: {
        totalCampaigns,
        totalCustomerEvents,
        totalAbandonedCarts,
        recoveredCarts,
        pendingCarts,
        recoveryRate:
          totalAbandonedCarts > 0
            ? Math.round((recoveredCarts / totalAbandonedCarts) * 100)
            : 0,
        totalDraftOrders,
        totalProfiles,
        totalAccessRequests,
        totalAutomationDispatches,
      },
      recentEvents: recentEvents || [],
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return Response.json({ error: "Database query failed" }, { status: 503 });
  }
}
