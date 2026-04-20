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

  useEffect(() => {
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
  }, [page]);

  const statusBadge: Record<string, string> = {
    created: "bg-blue-500/20 text-blue-400",
    invoiced: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Draft Orders (from Slack)</h2>

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
          No draft orders yet. Send a message in the connected Slack channel to create one.
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
              <button onClick={() => {
                setLoading(true);
                setPage((p) => Math.max(1, p - 1));
              }} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30">Previous</button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => {
                setLoading(true);
                setPage((p) => Math.min(totalPages, p + 1));
              }} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
