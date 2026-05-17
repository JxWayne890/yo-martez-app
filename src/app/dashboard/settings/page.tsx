"use client";

import { useEffect, useState } from "react";

interface Settings {
  shopifyDomain: string | null;
  fromEmail: string | null;
  fromName: string | null;
  dashboardAuthEnabled: boolean;
  supabaseAuthConfigured: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json();
      })
      .then((data) => {
        setSettings(data.settings);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400 text-center mt-20">Loading settings...</div>;
  }

  if (error) {
    return (
      <div className="page-shell max-w-3xl">
        <div className="page-header">
          <div>
            <h2 className="page-title">Store Settings</h2>
          </div>
        </div>
        <div className="alert-error">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">{error}.</p>
        </div>
      </div>
    );
  }

  const rows: Array<{ label: string; value: string | null }> = [
    { label: "Shopify domain", value: settings?.shopifyDomain || null },
    { label: "From email", value: settings?.fromEmail || null },
    { label: "From name", value: settings?.fromName || null },
    {
      label: "Dashboard login",
      value: settings?.dashboardAuthEnabled
        ? settings?.supabaseAuthConfigured
          ? "enabled"
          : "missing Supabase config"
        : "bypassed for testing",
    },
  ];

  return (
    <div className="page-shell max-w-3xl">
      <div className="page-header">
        <div>
          <h2 className="page-title">Store Settings</h2>
          <p className="page-subtitle">Deployment, email, Shopify, and dashboard configuration.</p>
        </div>
      </div>

      <div className="surface surface-pad">
        <h3 className="metric-label mb-3">Configuration</h3>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 border-b border-white/[0.06] py-3 last:border-0">
              <span className="text-gray-400 text-sm">{row.label}</span>
              <span className="text-white text-sm font-mono">{row.value || "—"}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Settings are read from the deployment environment and Supabase.
        </p>
      </div>
    </div>
  );
}
