"use client";

import { useEffect, useState } from "react";
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
      fetch("/api/dashboard/stats").then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard data");
        return r.json();
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
        { label: "Email Campaigns", value: stats.totalCampaigns, color: "purple" },
        { label: "Customer Events", value: stats.totalCustomerEvents, color: "blue" },
        { label: "Abandoned Carts", value: stats.totalAbandonedCarts, color: "orange" },
        { label: "Recovered", value: stats.recoveredCarts, color: "green" },
        { label: "Recovery Rate", value: `${stats.recoveryRate}%`, color: "green" },
        { label: "Pending Recovery", value: stats.pendingCarts, color: "yellow" },
        { label: "Draft Orders", value: stats.totalDraftOrders, color: "indigo" },
        { label: "Profiles", value: stats.totalProfiles, color: "blue" },
        { label: "Access Requests", value: stats.totalAccessRequests, color: "orange" },
        { label: "Automation Sends", value: stats.totalAutomationDispatches, color: "purple" },
      ]
    : [];

  const colorMap: Record<string, string> = {
    purple: "border-purple-500/30 bg-purple-500/10",
    blue: "border-blue-500/30 bg-blue-500/10",
    orange: "border-orange-500/30 bg-orange-500/10",
    green: "border-green-500/30 bg-green-500/10",
    yellow: "border-yellow-500/30 bg-yellow-500/10",
    indigo: "border-indigo-500/30 bg-indigo-500/10",
  };

  const eventTypeLabels: Record<string, string> = {
    customer_created: "New Customer",
    subscribed: "Subscribed",
    unsubscribed: "Unsubscribed",
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">Overview</h2>
          <p className="text-gray-400 mt-2 font-medium">Here's what's happening with your store today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-md">
            Last updated: Just now
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-8 backdrop-blur-md">
          <h3 className="text-red-400 font-bold mb-1 text-lg">Unable to load data</h3>
          <p className="text-red-400/80 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      )}

      {usage && <UsagePanel usage={usage} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-10">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-[2rem] p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] hover:border-white/[0.15] hover:bg-[#1f1f2e]/80 transition-all duration-300 shadow-xl"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${colorMap[card.color]?.split(' ')[1] || 'bg-white/5'} rounded-full blur-[50px] -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-[1.5]`}></div>
            <div className="relative z-10 flex flex-col h-full min-h-[100px]">
              <div className="text-sm font-medium text-gray-400 mb-4">{card.label}</div>
              <div className="mt-auto">
                <div className="text-4xl font-extrabold tracking-tighter text-white drop-shadow-sm">{card.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#1a1a24]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/[0.05] p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold tracking-tight text-white mb-6">Recent Activity</h3>
          {recentEvents.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <p className="text-gray-500 text-sm">No activity yet. Events will show up here once webhooks start flowing.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.05] transition-all duration-200"
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0">
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
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                      {eventTypeLabels[event.eventType] || event.eventType}
                    </span>
                    {event.emailSent && (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
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
