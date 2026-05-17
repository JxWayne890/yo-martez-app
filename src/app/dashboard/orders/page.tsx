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
  customerPhone: string | null;
  total: string | null;
  subtotal: string | null;
  tax: string | null;
  discounts: string | null;
  currency: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  sourceName: string | null;
  tags: string[];
  note: string | null;
  cancelledAt: string | null;
  refundCount: number;
  shipTo: string | null;
  itemCount: number;
  lineItems: LineItem[];
}

interface OrdersSummary {
  totalRevenue: string;
  itemCount: number;
  fulfilled: number;
  paid: number;
  withRefunds: number;
  cancelled: number;
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

async function fetchOrders(
  filter: string
): Promise<{ orders: Order[]; summary: OrdersSummary | null }> {
  const response = await fetch(`/api/dashboard/orders?filter=${filter}&limit=100`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Failed to load orders");
  }

  const data = await response.json();
  return {
    orders: data.orders || [],
    summary: data.summary || null,
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = (f: string) => {
    setRefreshing(true);
    fetchOrders(f)
      .then((data) => {
        setOrders(data.orders);
        setSummary(data.summary);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load orders"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    let isCurrent = true;

    fetchOrders(filter)
      .then((data) => {
        if (!isCurrent) return;
        setOrders(data.orders);
        setSummary(data.summary);
        setError(null);
      })
      .catch((err) => {
        if (!isCurrent) return;
        setError(err.message || "Failed to load orders");
      })
      .finally(() => {
        if (!isCurrent) return;
        setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [filter]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Orders
          </h2>
          <p className="page-subtitle">
            Live from Shopify · up to 100 most recent
          </p>
        </div>
        <button
          onClick={() => load(filter)}
          disabled={refreshing}
          className="btn-secondary disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="tab-row">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`tab-button ${filter === f.value ? "tab-button-active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="metric-card">
            <div className="metric-label">Revenue In View</div>
            <div className="metric-value">
              {formatMoney(summary.totalRevenue, "USD")}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Items Ordered</div>
            <div className="metric-value">
              {summary.itemCount}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Paid</div>
            <div className="metric-value">
              {summary.paid}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Fulfilled</div>
            <div className="metric-value">
              {summary.fulfilled}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Refunds / Cancels</div>
            <div className="metric-value">
              {summary.withRefunds} / {summary.cancelled}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center mt-16">Loading orders...</div>
      ) : error ? (
        <div className="alert-error">
          <h3 className="text-red-400 font-bold mb-1 text-lg">
            Unable to load orders
          </h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p className="text-gray-500 text-sm">
            No orders found with this filter.
          </p>
        </div>
      ) : (
        <div className="table-shell table-scroll">
          <table className="data-table">
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
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Ship To
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
                <th className="text-left text-gray-400 font-medium px-5 py-3">
                  Products
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const fullName =
                  `${order.customerFirstName || ""} ${order.customerLastName || ""}`.trim();
                const customerLabel =
                  fullName || order.customerEmail || order.customerPhone || null;
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
                      ) : customerLabel ? (
                        <div>
                          <div className="text-white">{customerLabel}</div>
                          {order.customerPhone && fullName ? (
                            <div className="text-gray-500 text-xs">
                              {order.customerPhone}
                            </div>
                          ) : (
                            <div className="text-gray-600 text-xs">
                              No email on order
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No customer</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {order.sourceName || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {order.shipTo || "—"}
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
                    <td className="px-5 py-4 text-gray-400 text-xs max-w-xs">
                      {order.lineItems.length > 0
                        ? order.lineItems
                            .slice(0, 3)
                            .map((item) => `${item.quantity}x ${item.title}`)
                            .join(", ")
                        : "—"}
                      {order.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {order.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-gray-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
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
