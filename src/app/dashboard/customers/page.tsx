"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CustomerEvent {
  id: string;
  shopifyCustomerId: string;
  customerEmail: string;
  customerName: string | null;
  eventType: string;
  emailSent: string | null;
  createdAt: string;
}

export default function CustomersPage() {
  const [events, setEvents] = useState<CustomerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (eventType) params.set("eventType", eventType);

    fetch(`/api/dashboard/customers?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load customer events");
        return r.json();
      })
      .then((data) => {
        setEvents(data.events || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  }, [eventType, page]);

  const filters = [
    { value: "", label: "All Events" },
    { value: "customer_created", label: "New Customers" },
    { value: "subscribed", label: "Subscribed" },
    { value: "unsubscribed", label: "Unsubscribed" },
  ];

  const eventBadge: Record<string, string> = {
    customer_created: "bg-blue-500/20 text-blue-400",
    subscribed: "bg-green-500/20 text-green-400",
    unsubscribed: "bg-red-500/20 text-red-400",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Customer Events</h2>

      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setLoading(true);
              setEventType(f.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              eventType === f.value
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
      ) : events.length === 0 ? (
        <div className="text-gray-500 text-center mt-10 bg-gray-800/50 rounded-xl border border-gray-700 p-10">
          No customer events yet. They&apos;ll appear here when Shopify sends customer webhooks.
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Customer</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Event</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Email Sent</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/20 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/dashboard/customers/${encodeURIComponent(event.customerEmail)}`;
                    }}
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/customers/${encodeURIComponent(event.customerEmail)}`}
                        className="block hover:text-purple-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-white">{event.customerName || "Unknown"}</div>
                        <div className="text-gray-500 text-xs">{event.customerEmail}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${eventBadge[event.eventType] || "bg-gray-600/20 text-gray-400"}`}>
                        {event.eventType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {event.emailSent ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                          {event.emailSent}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
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
