"use client";

import { useEffect, useState } from "react";

interface AccessRequestRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  comment: string | null;
  source: string;
  proofSubmittedAt: string | null;
  accessGrantedAt: string | null;
  passwordSentAt: string | null;
  reminderSentAt: string | null;
  createdAt: string;
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantingEmail, setGrantingEmail] = useState<string | null>(null);

  const loadRequests = () => {
    fetch("/api/dashboard/access-requests")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load access requests");
        return response.json();
      })
      .then((data) => {
        setRequests(data.requests || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load access requests");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const grantAccess = async (email: string) => {
    setLoading(true);
    setGrantingEmail(email);
    await fetch("/api/dashboard/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setGrantingEmail(null);
    loadRequests();
  };

  if (loading) {
    return <div className="text-gray-400 text-center mt-20">Loading access requests...</div>;
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Access Requests</h2>
          <p className="page-subtitle">Review proof submissions and approve members-only access.</p>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      <div className="table-shell table-scroll">
        <table className="data-table">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 font-medium px-5 py-3">Person</th>
              <th className="text-left text-gray-400 font-medium px-5 py-3">Source</th>
              <th className="text-left text-gray-400 font-medium px-5 py-3">Proof</th>
              <th className="text-left text-gray-400 font-medium px-5 py-3">Access</th>
              <th className="text-left text-gray-400 font-medium px-5 py-3">Requested</th>
              <th className="text-left text-gray-400 font-medium px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b border-gray-700/50">
                <td className="px-5 py-3">
                  <div className="text-white">
                    {[request.firstName, request.lastName].filter(Boolean).join(" ") || "Unknown"}
                  </div>
                  <div className="text-gray-500 text-xs">{request.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-400">{request.source}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${request.proofSubmittedAt ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {request.proofSubmittedAt ? "Submitted" : "Pending"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${request.accessGrantedAt ? "bg-blue-500/20 text-blue-400" : "bg-gray-600/20 text-gray-400"}`}>
                    {request.accessGrantedAt ? "Granted" : "Not Yet"}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(request.createdAt).toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => grantAccess(request.email)}
                    disabled={Boolean(request.accessGrantedAt) || grantingEmail === request.email}
                    className="btn-secondary text-xs disabled:opacity-40"
                  >
                    {grantingEmail === request.email ? "Granting..." : request.accessGrantedAt ? "Granted" : "Grant Access"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
