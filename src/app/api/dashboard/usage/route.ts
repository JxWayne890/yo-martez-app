import { supabase } from "@/lib/supabase";
import { TIER_LIMITS, currentMonth } from "@/lib/usage";

function missingRequiredEnv(): string[] {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (key) => !process.env[key]
  );
}

export async function GET() {
  const missingEnv = missingRequiredEnv();
  if (missingEnv.length > 0) {
    return Response.json(
      {
        error: `Supabase is not configured. Missing: ${missingEnv.join(", ")}.`,
        code: "missing_env",
        missingEnv,
      },
      { status: 503 }
    );
  }

  const month = currentMonth();

  const [metricsResult, customerCountResult] = await Promise.all([
    supabase
      .from("UsageMetric")
      .select("metric, count")
      .eq("month", month),
    supabase
      .from("CustomerProfile")
      .select("id", { count: "exact", head: true }),
  ]);

  if (metricsResult.error) {
    return Response.json(
      { error: "Failed to load usage", detail: metricsResult.error.message },
      { status: 500 }
    );
  }

  const lookup = new Map<string, number>(
    (metricsResult.data || []).map((row) => [row.metric as string, row.count as number])
  );

  const usage = {
    month,
    emails_sent: lookup.get("emails_sent") || 0,
    draft_orders_created: lookup.get("draft_orders_created") || 0,
    customers_imported: lookup.get("customers_imported") || 0,
    customers_tracked: customerCountResult.count || 0,
  };

  const starter = TIER_LIMITS.starter;
  const growth = TIER_LIMITS.growth;

  const currentTier =
    usage.emails_sent > growth.emails_sent ||
    usage.draft_orders_created > growth.draft_orders_created ||
    usage.customers_tracked > growth.customers_tracked
      ? "scale"
      : usage.emails_sent > starter.emails_sent ||
        usage.draft_orders_created > starter.draft_orders_created ||
        usage.customers_tracked > starter.customers_tracked
      ? "growth"
      : "starter";

  return Response.json({
    usage,
    tiers: TIER_LIMITS,
    currentTier,
  });
}
