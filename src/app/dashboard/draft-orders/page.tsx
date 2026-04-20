"use client";

import { useEffect, useState } from "react";

interface DraftOrder {
  id: string;
  shopifyDraftOrderId: string | null;
  customerName: string;
  customerEmail: string;
  parsedProducts: unknown;
  matchedVariants: unknown;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export default function DraftOrdersPage() {
  const [orders, setOrders] = useState<DraftOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [creating, setCreating] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch(`/api/dashboard/draft-orders?page=${page}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load draft orders");
        return r.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
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
        fetchOrders();
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

  const statusBadge: Record<string, string> = {
    created: "bg-blue-500/20 text-blue-400",
    invoiced: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Draft Orders</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + New Draft Order
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center mt-10">Loading...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mt-4">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-gray-500 text-center mt-10 bg-gray-800/50 rounded-xl border border-gray-700 p-10">
          No draft orders yet. Click &quot;New Draft Order&quot; to create one.
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Shopify ID</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Products</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const products = Array.isArray(order.parsedProducts)
                    ? order.parsedProducts
                    : [];

                  return (
                    <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="px-5 py-3">
                        <div className="text-white">{order.customerName}</div>
                        <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                        {order.shopifyDraftOrderId || "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {products.length > 0
                          ? products.map((p: Record<string, unknown>) => (p as { product?: string }).product || "Unknown").join(", ")
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[order.status] || "bg-gray-600/20 text-gray-400"}`}>
                          {order.status}
                        </span>
                        {order.errorMessage && (
                          <div className="text-red-400 text-xs mt-1 max-w-48 truncate" title={order.errorMessage}>
                            {order.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(order.createdAt).toLocaleString()}
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

      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <h3 className="text-xl font-bold text-white mb-2">New Draft Order</h3>
            <p className="text-gray-400 text-sm mb-4">
              Paste or type the order details in plain English. Gemini will extract the customer and products, fuzzy-match them against the Shopify catalog, create the draft order, and email the invoice.
            </p>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={8}
              placeholder={`e.g. "New order from Jane Doe (jane@example.com): 2x Yo! Crewneck size L, 1x Yo! Beanie"`}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
              disabled={submitting}
            />

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
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
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
