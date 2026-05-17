"use client";

import { useEffect, useState } from "react";

interface AudienceSummary {
  recipientCount: number;
  sampleRecipients: { email: string; firstName: string }[];
}

interface BroadcastResult {
  success: boolean;
  totalRecipients: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  failures: { email: string; error: string }[];
}

export default function PasswordPage() {
  const [audience, setAudience] = useState<AudienceSummary | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  const confirmationMatches = confirmText.trim().toLowerCase() === "send";
  const canSubmit = password.trim().length > 0 && confirmationMatches && !submitting;

  useEffect(() => {
    fetch("/api/dashboard/password-broadcast")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load password audience");
        }
        setAudience(data);
      })
      .catch((error) => {
        setAudienceError(error instanceof Error ? error.message : "Failed to load audience");
      })
      .finally(() => setLoadingAudience(false));
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const response = await fetch("/api/dashboard/password-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmed: true }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Password broadcast failed");
      }

      setResult(data);
      if (data.failedCount === 0) {
        setPassword("");
        setConfirmText("");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Password broadcast failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <div className="page-header">
        <div>
          <h2 className="page-title">Password Broadcast</h2>
          <p className="page-subtitle">
          Send the new members-only store password to all customers and approved access requests.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface surface-pad">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white">New Password Email</h3>
              <p className="text-sm text-gray-500 mt-1">
                Type the password exactly as customers should receive it.
              </p>
            </div>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
              Email
            </span>
          </div>

          <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
            Store password
          </label>
          <input
            id="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="form-field px-4 py-3"
            placeholder="Enter the new password"
            disabled={submitting}
          />

          <label className="block text-sm font-medium text-gray-300 mb-2 mt-5" htmlFor="confirm">
            Type SEND to confirm
          </label>
          <input
            id="confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className="form-field px-4 py-3"
            placeholder="SEND"
            disabled={submitting}
          />

          {submitError && (
            <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {submitError}
            </div>
          )}

          {result && (
            <div
              className={`mt-5 rounded-lg border p-4 text-sm ${
                result.failedCount > 0
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                  : "border-green-500/30 bg-green-500/10 text-green-300"
              }`}
            >
              <div className="font-medium">
                Sent {result.sentCount} password emails.
              </div>
              <div className="mt-1 text-gray-300">
                {result.skippedCount} already sent, {result.failedCount} failed, {result.totalRecipients} total recipients.
              </div>
              {result.failures.length > 0 && (
                <div className="mt-3 max-h-32 overflow-auto text-xs text-yellow-100">
                  {result.failures.slice(0, 10).map((failure) => (
                    <div key={failure.email}>
                      {failure.email}: {failure.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Password"}
            </button>
          </div>
        </section>

        <aside className="surface surface-pad">
          <h3 className="text-lg font-semibold text-white">Audience</h3>

          {loadingAudience ? (
            <div className="mt-6 text-sm text-gray-400">Loading audience...</div>
          ) : audienceError ? (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {audienceError}
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-lg bg-black/20 p-5">
                <div className="text-4xl font-bold text-white">{audience?.recipientCount || 0}</div>
                <div className="text-sm text-gray-400 mt-1">recipients ready</div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sample
                </div>
                <div className="mt-3 space-y-3">
                  {(audience?.sampleRecipients || []).map((recipient) => (
                    <div key={recipient.email} className="border-b border-gray-700/60 pb-3 last:border-0">
                      <div className="text-sm text-white">{recipient.firstName}</div>
                      <div className="text-xs text-gray-500">{recipient.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
