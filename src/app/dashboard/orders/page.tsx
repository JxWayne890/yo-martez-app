"use client";

import { useEffect, useState, type ReactElement } from "react";
import Link from "next/link";

interface LineItem {
  title: string;
  variant: string | null;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  customerEmail: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerId: number | null;
  total: string | null;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  sourceName: string | null;
  itemCount: number;
  lineItems: LineItem[];
}

const filters = [
  { value: "all", label: "All" },
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
];

function formatMoney(amount: string | null, currency: string): string {
  if (!amount) return "—";
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today · ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) {
    return `Yesterday · ${d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(
  status: string | null,
  type: "financial" | "fulfillment"
): ReactElement {
  if (!status) {
    return (
      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-700/30 text-gray-500 border border-gray-700">
        —
      </span>
    );
  }
  const normalized = status.toLowerCase();
  let color = "bg-gray-700/30 text-gray-400 border-gray-700";
  if (type === "financial") {
    if (normalized === "paid") color = "bg-green-500/20 text-green-300 border-green-500/30";
    else if (normalized === "pending" || normalized === "partially_paid")
      color = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    else if (normalized === "refunded" || normalized === "voided")
      color = "bg-gray-600/30 text-gray-400 border-gray-600";
  } else {
    if (normalized === "fulfilled") color = "bg-green-500/20 text-green-300 border-green-500/30";
    else if (normalized === "unfulfilled")
      color = "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    else if (normalized === "partial")
      color = "bg-orange-500/20 text-orange-300 border-orange-500/30";
  }
  return (
    <span
      className={`text-xs font-medium px-3 py-1.5 rounded-full border capitalize ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = (f: string) => {
    setRefreshing(true);
    fetch(`/api/dashboard/orders?filter=${f}&limit=100`)
      .then(async (r) => {
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          throw new Error(b.error || "Failed to load orders");
        }
        return r.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load orders"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Orders
          </h2>
          <p className="text-gray-400 mt-2 font-medium">
            Live from Shopify · up to 100 most recent
          </p>
        </div>
        <button
          onClick={() => load(filter)}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 text-center mt-16">Loading orders...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 backdrop-blur-md">
          <h3 className="text-red-400 font-bold mb-1 text-lg">
            Unable to load orders
          </h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05]">
          <p className="text-gray-500 text-sm">
            No orders found with this filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] overflow-hidden shadow-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Order
                </th>
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Date
                </th>
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Customer
                </th>
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Channel
                </th>
                <th className="text-right text-gray-400 font-medium px-5 py-3">
                  Total
                </th>
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Payment
                </th>
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Fulfillment
                </th>
                <th className="text-right text-gray-400 font-medium px-5 py-3">
                  Items
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const fullName =
                  `${order.customerFirstName || ""} ${order.customerLastName || ""}`.trim();
                return (
                  <tr
                    key={order.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-4 text-white font-semibold">
                      {order.name}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      {order.customerEmail ? (
                        <Link
                          href={`/dashboard/customers/${encodeURIComponent(order.customerEmail)}`}
                          className="hover:text-purple-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-white">
                            {fullName || "Unnamed"}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {order.customerEmail}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-gray-500">No customer</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {order.sourceName || "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-white font-semibold">
                      {formatMoney(order.total, order.currency)}
                    </td>
                    <td className="px-5 py-4">
                      {statusBadge(order.financialStatus, "financial")}
                    </td>
                    <td className="px-5 py-4">
                      {statusBadge(order.fulfillmentStatus, "fulfillment")}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-300 tabular-nums">
                      {order.itemCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
