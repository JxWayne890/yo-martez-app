"use client";

import { useEffect, useState } from "react";

interface LogDraftOrder {
  id: string;
  shopifyDraftOrderId: string | null;
  customerName: string;
  customerEmail: string;
  parsedProducts: unknown;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

interface ShopifyDraftOrder {
  id: number;
  name: string;
  email: string | null;
  customerName: string | null;
  status: string;
  invoiceUrl: string | null;
  invoiceSentAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  currency: string;
  totalPrice: string | null;
  lineItemCount: number;
  lineItems: Array<{
    title: string;
    variant: string | null;
    quantity: number;
    price: string | null;
  }>;
}

const shopifyFilters = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "completed", label: "Completed" },
];

function formatMoney(amount: string | null, currency = "USD"): string {
  if (!amount) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${value.toFixed(2)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string): string {
  if (status === "completed" || status === "invoiced") {
    return "bg-green-500/20 text-green-400";
  }
  if (status === "open" || status === "created") {
    return "bg-yellow-500/20 text-yellow-400";
  }
  if (status === "invoice_sent") {
    return "bg-blue-500/20 text-blue-400";
  }
  if (status === "failed") {
    return "bg-red-500/20 text-red-400";
  }
  return "bg-gray-600/20 text-gray-400";
}

export default function DraftOrdersPage() {
  const [mode, setMode] = useState<"shopify" | "log">("shopify");
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyDraftOrder[]>([]);
  const [shopifyStatus, setShopifyStatus] = useState("all");
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [shopifyError, setShopifyError] = useState<string | null>(null);

  const [logOrders, setLogOrders] = useState<LogDraftOrder[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [creating, setCreating] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchShopifyOrders = () => {
    setShopifyLoading(true);
    fetch(
      `/api/dashboard/draft-orders?source=shopify&status=${shopifyStatus}&limit=100`
    )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load Shopify draft orders");
        }
        return data;
      })
      .then((data) => {
        setShopifyOrders(data.orders || []);
        setShopifyError(null);
      })
      .catch((err) => {
        setShopifyError(err.message || "Failed to connect to Shopify");
      })
      .finally(() => setShopifyLoading(false));
  };

  const fetchLogOrders = () => {
    setLogLoading(true);
    fetch(`/api/dashboard/draft-orders?source=log&page=${page}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load draft order log");
        }
        return data;
      })
      .then((data) => {
        setLogOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setLogError(null);
      })
      .catch((err) => {
        setLogError(err.message || "Failed to connect to the database");
      })
      .finally(() => setLogLoading(false));
  };

  useEffect(() => {
    fetchShopifyOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopifyStatus]);

  useEffect(() => {
    fetchLogOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/dashboard/draft-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setSubmitError(data.error || "Draft order could not be created.");
      } else {
        const unmatchedNote =
          data.unmatchedProducts?.length > 0
            ? ` Unmatched: ${data.unmatchedProducts.join(", ")}.`
            : "";
        setSubmitSuccess(
          `Draft order #${data.draftOrderId} invoiced to ${data.log?.customerEmail}.${unmatchedNote}`
        );
        setMessageText("");
        fetchLogOrders();
        fetchShopifyOrders();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setCreating(false);
    setMessageText("");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const loading = mode === "shopify" ? shopifyLoading : logLoading;
  const error = mode === "shopify" ? shopifyError : logError;

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Draft Orders
          </h2>
          <p className="page-subtitle">
            Create invoices from plain English and audit live Shopify drafts.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary"
        >
          + New Draft Order
        </button>
      </div>

      <div className="tab-row">
        <button
          onClick={() => setMode("shopify")}
          className={`tab-button ${mode === "shopify" ? "tab-button-active" : ""}`}
        >
          Shopify Drafts
        </button>
        <button
          onClick={() => setMode("log")}
          className={`tab-button ${mode === "log" ? "tab-button-active" : ""}`}
        >
          Automation Log
        </button>
      </div>

      {mode === "shopify" && (
        <div className="tab-row">
          {shopifyFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setShopifyStatus(filter.value)}
              className={`tab-button text-xs ${shopifyStatus === filter.value ? "tab-button-active" : ""}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-center mt-10">Loading...</div>
      ) : error ? (
        <div className="alert-error">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : mode === "shopify" ? (
        shopifyOrders.length === 0 ? (
          <div className="empty-state">
            No Shopify draft orders found for this view.
          </div>
        ) : (
          <div className="table-shell table-scroll">
            <table className="data-table">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Draft</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Total</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Items</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Products</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {shopifyOrders.map((order) => (
                  <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-white font-semibold">{order.name}</td>
                    <td className="px-5 py-4 text-gray-400">{formatDate(order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="text-white">{order.customerName || "No customer"}</div>
                      <div className="text-gray-500 text-xs">{order.email || "—"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusBadge(order.status)}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-white font-semibold">
                      {formatMoney(order.totalPrice, order.currency)}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-300">{order.lineItemCount}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs max-w-xs">
                      {order.lineItems.length > 0
                        ? order.lineItems
                            .slice(0, 3)
                            .map((item) => `${item.quantity}x ${item.title}`)
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {order.invoiceUrl ? (
                        <a
                          href={order.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-300 hover:text-purple-200 text-xs"
                        >
                          Open
                        </a>
                      ) : order.invoiceSentAt ? (
                        <span className="text-gray-400 text-xs">Sent</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : logOrders.length === 0 ? (
        <div className="empty-state">
          No app-created draft orders yet.
        </div>
      ) : (
        <>
          <div className="table-shell table-scroll">
            <table className="data-table">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Shopify ID</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Products</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logOrders.map((order) => {
                  const products = Array.isArray(order.parsedProducts)
                    ? order.parsedProducts
                    : [];

                  return (
                    <tr key={order.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="text-white">{order.customerName}</div>
                        <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs font-mono">
                        {order.shopifyDraftOrderId || "—"}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {products.length > 0
                          ? products
                              .map((p: Record<string, unknown>) =>
                                (p as { product?: string }).product || "Unknown"
                              )
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                        {order.errorMessage && (
                          <div className="text-red-400 text-xs mt-1 max-w-48 truncate" title={order.errorMessage}>
                            {order.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm disabled:opacity-30"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="surface surface-pad w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-bold text-white mb-2">New Draft Order</h3>
            <p className="text-gray-400 text-sm mb-4">
              Paste or type the order details in plain English. Include the customer name, email, and products so the app can match Shopify items, create the draft order, and email the invoice.
            </p>

            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              rows={8}
              placeholder={`e.g. "New order from Jane Doe (jane@example.com): 2x Yo! Crewneck size L, 1x Yo! Beanie"`}
              className="form-field w-full px-4 py-2.5 text-sm"
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-2">
              Example: New order from Jane Doe (jane@example.com): 1x Yo! Crewneck size L
            </p>

            {submitError && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                {submitError}
              </div>
            )}

            {submitSuccess && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">
                {submitSuccess}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                disabled={submitting}
              >
                {submitSuccess ? "Close" : "Cancel"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !messageText.trim() || !!submitSuccess}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Draft Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
