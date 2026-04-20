"use client";

import { useEffect, useState } from "react";

interface Settings {
  shopifyDomain: string | null;
  fromEmail: string | null;
  fromName: string | null;
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
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Store Settings</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
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
  ];

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Store Settings</h2>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
        <h3 className="text-sm text-gray-400 font-medium mb-3">CONFIGURATION</h3>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between">
              <span className="text-gray-400 text-sm">{row.label}</span>
              <span className="text-white text-sm font-mono">{row.value || "—"}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Settings are read from environment variables. Edit them in Vercel and redeploy to take effect.
        </p>
      </div>
    </div>
  );
}
