"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TrackedCart {
  id: string;
  customerEmail: string;
  customerFirstName: string | null;
  totalPrice: string | null;
  lineItems: unknown;
  checkoutCreatedAt: string;
  timesContacted: number;
  lastContactedAt: string | null;
  currentStage: number;
  isRecovered: boolean;
  isCompleted: boolean;
  abandonedCheckoutUrl: string;
}

interface ShopifyCheckout {
  id: number;
  email: string | null;
  customerName: string | null;
  phone: string | null;
  region: string | null;
  totalPrice: string | null;
  currency: string;
  createdAt: string | null;
  updatedAt: string | null;
  abandonedCheckoutUrl: string | null;
  recoveryStatus: "recovered" | "closed" | "not_recovered";
  lineItemCount: number;
  lineItems: Array<{
    title: string;
    variant: string | null;
    quantity: number;
    price: string | null;
  }>;
}

const trackingFilters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "recovered", label: "Recovered" },
  { value: "completed", label: "Exhausted" },
];

function money(amount: string | null, currency = "USD"): string {
  if (!amount) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
}

function date(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

export default function AbandonedCartsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"shopify" | "tracking">("shopify");

  const [trackedCarts, setTrackedCarts] = useState<TrackedCart[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [shopifyCheckouts, setShopifyCheckouts] = useState<ShopifyCheckout[]>([]);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);

  const loadTracking = () => {
    setTrackingLoading(true);
    fetch(`/api/dashboard/abandoned-carts?source=tracking&filter=${filter}&page=${page}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load recovery tracking");
        }
        return data;
      })
      .then((data) => {
        setTrackedCarts(data.carts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTrackingError(null);
      })
      .catch((err) => {
        setTrackingError(err.message || "Failed to connect to the server");
      })
      .finally(() => setTrackingLoading(false));
  };

  const loadShopify = () => {
    setShopifyLoading(true);
    fetch("/api/dashboard/abandoned-carts?source=shopify&limit=100")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load Shopify checkouts");
        }
        return data;
      })
      .then((data) => {
        setShopifyCheckouts(data.checkouts || []);
        setShopifyError(null);
      })
      .catch((err) => {
        setShopifyError(err.message || "Failed to connect to Shopify");
      })
      .finally(() => setShopifyLoading(false));
  };

  useEffect(() => {
    loadTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  useEffect(() => {
    loadShopify();
  }, []);

  const stageLabels: Record<number, string> = {
    0: "Not contacted",
    1: "Email #1 sent",
    2: "Email #2 sent",
    3: "Email #3 sent (final)",
  };

  const stageColors: Record<number, string> = {
    0: "bg-gray-600/20 text-gray-400",
    1: "bg-yellow-500/20 text-yellow-400",
    2: "bg-orange-500/20 text-orange-400",
    3: "bg-red-500/20 text-red-400",
  };

  const loading = mode === "shopify" ? shopifyLoading : trackingLoading;
  const error = mode === "shopify" ? shopifyError : trackingError;

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Abandoned Cart Recovery
          </h2>
          <p className="text-gray-400 mt-2 font-medium">
            Compare Shopify abandoned checkouts with the automation recovery stages.
          </p>
        </div>
        <button
          onClick={mode === "shopify" ? loadShopify : loadTracking}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setMode("shopify")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "shopify"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Shopify Checkouts
        </button>
        <button
          onClick={() => setMode("tracking")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            mode === "tracking"
              ? "bg-purple-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Recovery Tracking
        </button>
      </div>

      {mode === "tracking" && (
        <div className="flex flex-wrap gap-2 mb-6">
          {trackingFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === f.value
                  ? "bg-white/10 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center mt-10">Loading...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mt-4">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : mode === "shopify" ? (
        shopifyCheckouts.length === 0 ? (
          <div className="text-gray-500 text-center mt-10 bg-gray-800/50 rounded-xl border border-gray-700 p-10">
            No Shopify abandoned checkouts found.
          </div>
        ) : (
          <div className="bg-[#1a1a24]/80 border border-white/[0.05] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Checkout</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Region</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Total</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Items</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Recovery</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Products</th>
                </tr>
              </thead>
              <tbody>
                {shopifyCheckouts.map((checkout) => (
                  <tr key={checkout.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      {checkout.abandonedCheckoutUrl ? (
                        <a
                          href={checkout.abandonedCheckoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-white font-semibold hover:text-purple-300"
                        >
                          #{checkout.id}
                        </a>
                      ) : (
                        <span className="text-white font-semibold">#{checkout.id}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400">{date(checkout.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="text-white">{checkout.customerName || "Unknown"}</div>
                      <div className="text-gray-500 text-xs">{checkout.email || "No email"}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">{checkout.region || "—"}</td>
                    <td className="px-5 py-4 text-right text-white font-semibold">
                      {money(checkout.totalPrice, checkout.currency)}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-300">{checkout.lineItemCount}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          checkout.recoveryStatus === "recovered"
                            ? "bg-green-500/20 text-green-400"
                            : checkout.recoveryStatus === "closed"
                              ? "bg-gray-600/20 text-gray-400"
                              : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {checkout.recoveryStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs max-w-xs">
                      {checkout.lineItems.length > 0
                        ? checkout.lineItems
                            .slice(0, 3)
                            .map((item) => `${item.quantity}x ${item.title}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : trackedCarts.length === 0 ? (
        <div className="text-gray-500 text-center mt-10 bg-gray-800/50 rounded-xl border border-gray-700 p-10">
          No recovery tracking rows found. They appear once the daily cron runs.
        </div>
      ) : (
        <>
          <div className="bg-[#1a1a24]/80 border border-white/[0.05] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Total</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Abandoned</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Stage</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Last Contacted</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Checkout</th>
                </tr>
              </thead>
              <tbody>
                {trackedCarts.map((cart) => (
                  <tr
                    key={cart.id}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                    onClick={() => router.push(`/dashboard/abandoned-carts/${cart.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="text-white">{cart.customerFirstName || "Unknown"}</div>
                      <div className="text-gray-500 text-xs">{cart.customerEmail}</div>
                    </td>
                    <td className="px-5 py-4 text-white">{money(cart.totalPrice)}</td>
                    <td className="px-5 py-4 text-gray-400">{date(cart.checkoutCreatedAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${stageColors[cart.currentStage] || stageColors[0]}`}>
                        {stageLabels[cart.currentStage] || `Stage ${cart.currentStage}`}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {cart.lastContactedAt ? date(cart.lastContactedAt) : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      {cart.isRecovered ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          Recovered
                        </span>
                      ) : cart.isCompleted ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-600/20 text-gray-400">
                          Exhausted
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {cart.abandonedCheckoutUrl ? (
                        <a
                          href={cart.abandonedCheckoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="text-purple-300 hover:text-purple-200 text-xs"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
