"use client";

import { useEffect, useState } from "react";

interface EmailPreviewModalProps {
  slug: string;
  email?: string;
  cartId?: string;
  sentAt?: string;
  onClose: () => void;
}

interface PreviewData {
  subject: string;
  html: string;
  to?: string | null;
  from?: string;
}

export function EmailPreviewModal({
  slug,
  email,
  cartId,
  sentAt,
  onClose,
}: EmailPreviewModalProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ slug });
    if (email) params.set("email", email);
    if (cartId) params.set("cartId", cartId);

    fetch(`/api/dashboard/preview-email?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load preview");
        }
        return r.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load preview"))
      .finally(() => setLoading(false));
  }, [slug, email, cartId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inbox-like header */}
        <div className="p-6 border-b border-white/[0.05] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white mb-3 truncate">
                {data?.subject || "Loading..."}
              </h3>
              <dl className="space-y-1 text-sm">
                {data?.from && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-12">From</dt>
                    <dd className="text-gray-300 truncate">{data.from}</dd>
                  </div>
                )}
                {data?.to && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-12">To</dt>
                    <dd className="text-gray-300 truncate">{data.to}</dd>
                  </div>
                )}
                {sentAt && (
                  <div className="flex gap-2">
                    <dt className="text-gray-500 w-12">Sent</dt>
                    <dd className="text-gray-300">
                      {new Date(sentAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors shrink-0"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-white/[0.02] rounded-b-[2rem]">
          {loading && (
            <div className="text-gray-400 text-center py-20">
              Loading preview...
            </div>
          )}
          {error && (
            <div className="m-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {data && !error && (
            <iframe
              srcDoc={data.html}
              title="Email preview"
              sandbox=""
              className="w-full h-[600px] bg-white rounded-b-[2rem]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
