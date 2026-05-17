"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UsagePanel } from "@/components/usage-panel";

interface Stats {
  totalCampaigns: number;
  totalCustomerEvents: number;
  totalAbandonedCarts: number;
  recoveredCarts: number;
  pendingCarts: number;
  recoveryRate: number;
  totalDraftOrders: number;
  totalProfiles: number;
  totalAccessRequests: number;
  totalAutomationDispatches: number;
}

interface RecentEvent {
  id: string;
  customerEmail: string;
  customerName: string | null;
  eventType: string;
  emailSent: string | null;
  createdAt: string;
}

interface Usage {
  month: string;
  emails_sent: number;
  draft_orders_created: number;
  customers_imported: number;
  customers_tracked: number;
}

interface TierLimits {
  emails_sent: number;
  draft_orders_created: number;
  customers_tracked: number;
}

interface UsageResponse {
  usage: Usage;
  tiers: {
    starter: TierLimits;
    growth: TierLimits;
    scale: TierLimits;
  };
  currentTier: "starter" | "growth" | "scale";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          throw new Error(data?.error || "Failed to load dashboard data");
        }
        return data;
      }),
      fetch("/api/dashboard/usage").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([statsData, usageData]) => {
        setStats(statsData.stats);
        setRecentEvents(statsData.recentEvents || []);
        setUsage(usageData);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-20">Loading dashboard...</div>
    );
  }

  const statCards = stats
    ? [
        { label: "Email Campaigns", value: stats.totalCampaigns },
        { label: "Customer Events", value: stats.totalCustomerEvents },
        { label: "Abandoned Carts", value: stats.totalAbandonedCarts },
        { label: "Recovered", value: stats.recoveredCarts },
        { label: "Recovery Rate", value: `${stats.recoveryRate}%` },
        { label: "Pending Recovery", value: stats.pendingCarts },
        { label: "Draft Orders", value: stats.totalDraftOrders },
        { label: "Profiles", value: stats.totalProfiles },
        { label: "Access Requests", value: stats.totalAccessRequests },
        { label: "Automation Sends", value: stats.totalAutomationDispatches },
      ]
    : [];

  const eventTypeLabels: Record<string, string> = {
    customer_created: "New Customer",
    subscribed: "Subscribed",
    unsubscribed: "Unsubscribed",
  };

  const quickLinks = [
    {
      href: "/dashboard/products",
      title: "Products",
      description: "Browse Shopify products, variants, prices, images, and copy campaign-ready product blocks.",
    },
    {
      href: "/dashboard/orders",
      title: "Orders",
      description: "Check recent Shopify orders, customers, payment, fulfillment, and line items.",
    },
    {
      href: "/dashboard/draft-orders",
      title: "Draft Orders",
      description: "Create invoice drafts and review live Shopify draft order status.",
    },
    {
      href: "/dashboard/campaigns",
      title: "Campaigns",
      description: "Edit automation emails and insert real Shopify products into the message body.",
    },
  ];

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Overview</h2>
          <p className="page-subtitle">Today&apos;s automation health, Shopify activity, and customer movement.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="btn-secondary">
            Last updated: Just now
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <h3 className="text-red-400 font-bold mb-1 text-lg">Unable to load data</h3>
          <p className="text-red-400/80 text-sm">
            {error}
          </p>
        </div>
      )}

      {usage && <UsagePanel usage={usage} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="metric-card"
          >
            <div className="metric-label">{card.label}</div>
            <div className="metric-value">{card.value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Shopify Quick Checks
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Fast access to the store data that feeds automations.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="surface surface-pad hover:border-teal-400/30 transition-colors"
            >
              <div className="text-white font-bold">{link.title}</div>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="surface surface-pad">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white mb-6">Recent Activity</h3>
          {recentEvents.length === 0 ? (
            <div className="empty-state">
              <p className="text-gray-500 text-sm">No activity yet. Events will show up here once webhooks start flowing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] transition-all duration-200"
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
                      {(event.customerName || event.customerEmail || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {event.customerName || event.customerEmail}
                      </div>
                      <div className="text-gray-500 text-sm">
                        {event.customerName ? event.customerEmail : ""}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </span>
                    {event.emailSent && (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {event.emailSent}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      {new Date(event.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
