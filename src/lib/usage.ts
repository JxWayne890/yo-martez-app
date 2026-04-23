import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export type UsageMetric =
  | "emails_sent"
  | "draft_orders_created"
  | "customers_imported";

export const TIER_LIMITS = {
  starter: {
    emails_sent: 5_000,
    draft_orders_created: 50,
    customers_tracked: 1_000,
  },
  growth: {
    emails_sent: 25_000,
    draft_orders_created: 250,
    customers_tracked: 10_000,
  },
  scale: {
    emails_sent: 100_000,
    draft_orders_created: 1_000,
    customers_tracked: 50_000,
  },
} as const;

export function currentMonth(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function incrementUsage(
  metric: UsageMetric,
  count: number = 1
): Promise<void> {
  try {
    const month = currentMonth();
    const { error } = await supabase.rpc("increment_usage", {
      p_month: month,
      p_metric: metric,
      p_count: count,
    });
    if (error) {
      logger.warn("Usage increment failed", { metric, count, error: error.message });
    }
  } catch (error) {
    logger.warn("Usage increment threw", {
      metric,
      count,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
