"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Cart {
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

export default function AbandonedCartsPage() {
  const router = useRouter();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/dashboard/abandoned-carts?filter=${filter}&page=${page}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load abandoned carts");
        return r.json();
      })
      .then((data) => {
        setCarts(data.carts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

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

  const filters = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "recovered", label: "Recovered" },
    { value: "completed", label: "Exhausted" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Abandoned Cart Recovery</h2>

      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setLoading(true);
              setFilter(f.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
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
        <div className="text-gray-400 text-center mt-10">Loading...</div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mt-4">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      ) : carts.length === 0 ? (
        <div className="text-gray-500 text-center mt-10 bg-gray-800/50 rounded-xl border border-gray-700 p-10">
          No abandoned carts found. They&apos;ll appear here once the daily cron runs.
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Total</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Abandoned</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Stage</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Last Contacted</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((cart) => (
                  <tr
                    key={cart.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer"
                    onClick={() => router.push(`/dashboard/abandoned-carts/${cart.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="text-white">{cart.customerFirstName || "Unknown"}</div>
                      <div className="text-gray-500 text-xs">{cart.customerEmail}</div>
                    </td>
                    <td className="px-5 py-3 text-white">${cart.totalPrice || "0"}</td>
                    <td className="px-5 py-3 text-gray-400">
                      {new Date(cart.checkoutCreatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${stageColors[cart.currentStage] || stageColors[0]}`}>
                        {stageLabels[cart.currentStage] || `Stage ${cart.currentStage}`}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {cart.lastContactedAt
                        ? new Date(cart.lastContactedAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-5 py-3">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => {
                  setLoading(true);
                  setPage((p) => Math.max(1, p - 1));
                }}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 text-gray-400 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => {
                  setLoading(true);
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
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
