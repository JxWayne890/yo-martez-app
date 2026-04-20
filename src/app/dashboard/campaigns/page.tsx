"use client";

import { useEffect, useState } from "react";

interface Template {
  id: string;
  slug: string;
  subject: string;
  htmlBody: string;
  isActive: boolean;
  updatedAt: string;
}

export default function CampaignsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", subject: "", htmlBody: "" });
  const [saving, setSaving] = useState(false);

  const fetchTemplates = () => {
    fetch("/api/dashboard/campaigns")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load campaigns");
        return r.json();
      })
      .then((data) => {
        setTemplates(data.templates || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to connect to the server");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    await fetch("/api/dashboard/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setCreating(false);
    setForm({ slug: "", subject: "", htmlBody: "" });
    setSaving(false);
    fetchTemplates();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    await fetch("/api/dashboard/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, ...form }),
    });
    setEditing(null);
    setForm({ slug: "", subject: "", htmlBody: "" });
    setSaving(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    await fetch(`/api/dashboard/campaigns?id=${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const handleToggle = async (template: Template) => {
    await fetch("/api/dashboard/campaigns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, isActive: !template.isActive }),
    });
    fetchTemplates();
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setCreating(false);
    setForm({ slug: t.slug, subject: t.subject, htmlBody: t.htmlBody });
  };

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ slug: "", subject: "", htmlBody: "" });
  };

  const slugLabels: Record<string, string> = {
    welcome: "Welcome Email",
    farewell: "Unsubscribe Email",
    "abandoned-cart-1": "Abandoned Cart #1",
    "abandoned-cart-2": "Abandoned Cart #2",
    "abandoned-cart-3": "Abandoned Cart #3 (Last Call)",
    "reengagement-45": "Re-engagement Day 45",
    "reengagement-60": "Re-engagement Day 60 (Product Picks)",
    "reengagement-75": "Re-engagement Day 75 (COMEBACK15)",
    "reengagement-90": "Re-engagement Day 90 (Last Call)",
  };

  if (loading) {
    return <div className="text-gray-400 text-center mt-20">Loading campaigns...</div>;
  }

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Email Campaigns</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          + New Campaign
        </button>
      </div>

      {/* Campaign list */}
      <div className="space-y-3 mb-8">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-white font-medium">
                  {slugLabels[t.slug] || t.slug}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    t.isActive
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-600/20 text-gray-500"
                  }`}
                >
                  {t.isActive ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Subject: {t.subject}
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Updated {new Date(t.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(t)}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                {t.isActive ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => openEdit(t)}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor modal */}
      {(editing || creating) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {creating ? "Create Campaign" : "Edit Campaign"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Slug (identifier)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. welcome, abandoned-cart-1"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  disabled={!!editing}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  HTML Body
                </label>
                <textarea
                  value={form.htmlBody}
                  onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
                  rows={12}
                  placeholder="Paste your email HTML here..."
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {"{{customer_first_name}}"}, {"{{store_name}}"}, {"{{store_url}}"}, {"{{checkout_url}}"}, {"{{discount_code}}"}, {"{{discount_amount}}"}
                </p>
              </div>

              {/* Preview */}
              {form.htmlBody && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Preview
                  </label>
                  <div
                    className="bg-white rounded-lg p-4 max-h-64 overflow-auto"
                    dangerouslySetInnerHTML={{ __html: form.htmlBody }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={creating ? handleCreate : handleUpdate}
                disabled={saving || !form.slug || !form.subject || !form.htmlBody}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : creating ? "Create" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
