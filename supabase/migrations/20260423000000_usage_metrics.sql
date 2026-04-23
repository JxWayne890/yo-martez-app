-- Usage metering — tracks monthly volumes per metric.
-- Single-tenant for now. When the app forks to SaaS, add a `tenantId`
-- column and include it in the unique constraint / function signature.

CREATE TABLE IF NOT EXISTS "UsageMetric" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  month TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(month, metric)
);

CREATE INDEX IF NOT EXISTS usage_metric_month_idx
  ON "UsageMetric" (month);

CREATE OR REPLACE FUNCTION increment_usage(
  p_month TEXT,
  p_metric TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO "UsageMetric" (month, metric, count)
  VALUES (p_month, p_metric, p_count)
  ON CONFLICT (month, metric)
  DO UPDATE SET
    count = "UsageMetric".count + EXCLUDED.count,
    "updatedAt" = NOW()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
