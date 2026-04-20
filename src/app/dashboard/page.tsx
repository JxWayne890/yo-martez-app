"use client";

import { useEffect, useState } from "react";

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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load dashboard data");
        return r.json();
      })
      .then((data) => {
        setStats(data.stats);
        setRecentEvents(data.recentEvents || []);
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
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-8">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-5 ${colorMap[card.color] || "border-gray-700 bg-gray-800/50"}`}
          >
            <div className="text-sm text-gray-400 mb-1">{card.label}</div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        {recentEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet. Events will show up here once webhooks start flowing.</p>
        ) : (
          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-0"
              >
                <div>
                  <span className="text-white text-sm font-medium">
                    {event.customerName || event.customerEmail}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {event.customerName ? event.customerEmail : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                    {eventTypeLabels[event.eventType] || event.eventType}
                  </span>
                  {event.emailSent && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                      {event.emailSent}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
