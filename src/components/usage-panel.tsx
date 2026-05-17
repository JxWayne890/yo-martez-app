"use client";

interface TierLimits {
  emails_sent: number;
  draft_orders_created: number;
  customers_tracked: number;
}

interface UsageResponse {
  usage: {
    month: string;
    emails_sent: number;
    draft_orders_created: number;
    customers_imported: number;
    customers_tracked: number;
  };
  tiers: {
    starter: TierLimits;
    growth: TierLimits;
    scale: TierLimits;
  };
  currentTier: "starter" | "growth" | "scale";
}

const tierLabels = {
  starter: "Starter ($29/mo)",
  growth: "Growth ($79/mo)",
  scale: "Scale ($199/mo)",
} as const;

const tierBadgeColor = {
  starter: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  growth: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  scale: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
} as const;

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-").map((v) => parseInt(v, 10));
  if (!year || !month) return ym;
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface BarProps {
  label: string;
  value: number;
  tier: "starter" | "growth" | "scale";
  limit: number;
}

function UsageBar({ label, value, tier, limit }: BarProps) {
  const pct = Math.min(100, (value / limit) * 100);
  const nearing = pct >= 80 && pct < 100;
  const over = value > limit;

  const barColor = over
    ? "bg-red-500"
    : nearing
    ? "bg-yellow-500"
    : tier === "scale"
    ? "bg-yellow-400"
    : tier === "growth"
    ? "bg-purple-500"
    : "bg-blue-500";

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-white tabular-nums">
          {value.toLocaleString()}
          <span className="text-gray-500 font-normal"> / {limit.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <div className="text-xs text-red-400 mt-1">
          Over plan limit — upgrade to keep sending
        </div>
      )}
    </div>
  );
}

export function UsagePanel({ usage }: { usage: UsageResponse }) {
  const tier = usage.currentTier;
  const limits = usage.tiers[tier];

  const emailsPct = (usage.usage.emails_sent / limits.emails_sent) * 100;
  const draftsPct =
    (usage.usage.draft_orders_created / limits.draft_orders_created) * 100;
  const customersPct =
    (usage.usage.customers_tracked / limits.customers_tracked) * 100;
  const maxPct = Math.max(emailsPct, draftsPct, customersPct);

  const nextTier =
    tier === "starter" ? "growth" : tier === "growth" ? "scale" : null;

  return (
    <div className="surface surface-pad">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              Usage · {formatMonth(usage.usage.month)}
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white">Current plan</h3>
              <span
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${tierBadgeColor[tier]}`}
              >
                {tierLabels[tier]}
              </span>
            </div>
          </div>
          {nextTier && maxPct >= 80 && (
            <div className="text-sm px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300">
              You&apos;re trending toward {tierLabels[nextTier].split(" ")[0]} usage
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UsageBar
            label="Emails sent"
            value={usage.usage.emails_sent}
            tier={tier}
            limit={limits.emails_sent}
          />
          <UsageBar
            label="AI draft orders"
            value={usage.usage.draft_orders_created}
            tier={tier}
            limit={limits.draft_orders_created}
          />
          <UsageBar
            label="Customers tracked"
            value={usage.usage.customers_tracked}
            tier={tier}
            limit={limits.customers_tracked}
          />
        </div>
      </div>
    </div>
  );
}
