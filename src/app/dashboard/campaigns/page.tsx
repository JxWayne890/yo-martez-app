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

interface ProductPick {
  id: number;
  title: string;
  image: string | null;
  productUrl: string;
  minPrice: string | null;
  maxPrice: string | null;
}

interface UpcomingEmail {
  id: string;
  campaignName: string;
  stageLabel: string;
  recipientName: string;
  recipientEmail: string;
  subject: string | null;
  scheduledFor: string;
  status: "due" | "upcoming" | "blocked" | "missed";
  reason: string;
  source: string;
}

type CampaignView = "queue" | "templates";
type QueueFilter = "all" | UpcomingEmail["status"];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(amount: string | null): string {
  if (!amount) return "";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return `$${value.toFixed(2)}`;
}

function productPrice(product: ProductPick): string {
  if (!product.minPrice) return "";
  if (!product.maxPrice || product.minPrice === product.maxPrice) {
    return money(product.minPrice);
  }
  return `${money(product.minPrice)} - ${money(product.maxPrice)}`;
}

function formatQueueDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function queueStatusClass(status: UpcomingEmail["status"]): string {
  if (status === "due") return "bg-green-500/20 text-green-300";
  if (status === "blocked") return "bg-red-500/20 text-red-300";
  if (status === "missed") return "bg-yellow-500/20 text-yellow-300";
  return "bg-blue-500/20 text-blue-300";
}

function buildProductBlock(product: ProductPick): string {
  const title = escapeHtml(product.title);
  const url = escapeHtml(product.productUrl);
  const image = escapeHtml(product.image || "");
  const price = escapeHtml(productPrice(product));

  return `
<table role="presentation" style="width:100%;border-collapse:collapse;margin:24px 0;">
  <tr>
    <td style="padding:16px;text-align:center;">
      <a href="${url}" target="_blank">
        <img src="${image}" alt="${title}" style="width:100%;max-width:260px;border-radius:8px;" />
      </a>
      <h3 style="font-size:18px;margin:14px 0 6px;">${title}</h3>
      ${price ? `<p style="font-size:15px;margin:0 0 14px;color:#555;">${price}</p>` : ""}
      <a href="${url}" style="display:inline-block;background:#8A2BE2;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Shop Now</a>
    </td>
  </tr>
</table>`;
}

export default function CampaignsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", subject: "", htmlBody: "" });
  const [saving, setSaving] = useState(false);
  const [productPicks, setProductPicks] = useState<ProductPick[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productPickerLoading, setProductPickerLoading] = useState(false);
  const [productPickerError, setProductPickerError] = useState<string | null>(null);
  const [upcomingEmails, setUpcomingEmails] = useState<UpcomingEmail[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueNotes, setQueueNotes] = useState<string[]>([]);
  const [campaignView, setCampaignView] = useState<CampaignView>("queue");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");

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

  const fetchUpcomingEmails = () => {
    fetch("/api/dashboard/upcoming-emails?limit=50")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load upcoming emails");
        }
        return data;
      })
      .then((data) => {
        setUpcomingEmails(data.items || []);
        setQueueNotes(data.notes || []);
        setQueueError(null);
      })
      .catch((err) => {
        setQueueError(err.message || "Failed to load upcoming emails");
      })
      .finally(() => setQueueLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
    fetchUpcomingEmails();
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

  const openProductPicker = () => {
    setProductPickerOpen((open) => !open);
    if (productPicks.length > 0 || productPickerLoading) return;

    setProductPickerLoading(true);
    fetch("/api/dashboard/products?status=active&limit=50")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load products");
        }
        return data;
      })
      .then((data) => {
        setProductPicks(data.products || []);
        setProductPickerError(null);
      })
      .catch((err) => {
        setProductPickerError(err.message || "Failed to load products");
      })
      .finally(() => setProductPickerLoading(false));
  };

  const insertProduct = (product: ProductPick) => {
    const block = buildProductBlock(product);
    setForm((current) => ({
      ...current,
      htmlBody: current.htmlBody
        ? `${current.htmlBody.trim()}\n\n${block}`
        : block.trim(),
    }));
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

  const queueCounts: Record<QueueFilter, number> = {
    all: upcomingEmails.length,
    missed: upcomingEmails.filter((item) => item.status === "missed").length,
    due: upcomingEmails.filter((item) => item.status === "due").length,
    upcoming: upcomingEmails.filter((item) => item.status === "upcoming").length,
    blocked: upcomingEmails.filter((item) => item.status === "blocked").length,
  };

  const queueTabs: Array<{ value: QueueFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "missed", label: "Missed" },
    { value: "due", label: "Due" },
    { value: "upcoming", label: "Upcoming" },
    { value: "blocked", label: "Blocked" },
  ];

  const filteredUpcomingEmails =
    queueFilter === "all"
      ? upcomingEmails
      : upcomingEmails.filter((item) => item.status === queueFilter);

  if (loading) {
    return <div className="text-gray-400 text-center mt-20">Loading campaigns...</div>;
  }

  return (
    <div className="page-shell">
      {error && (
        <div className="alert-error">
          <h3 className="text-red-400 font-medium mb-1">Unable to load data</h3>
          <p className="text-gray-400 text-sm">
            {error}. Check that your database is configured and running.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="page-title">Email Campaigns</h2>
            <p className="page-subtitle">Campaign queue, templates, and product-ready email content.</p>
          </div>
          {campaignView === "templates" ? (
            <button
              onClick={openCreate}
              className="btn-primary"
            >
              + New Campaign
            </button>
          ) : null}
        </div>

        <div className="tab-row">
          <button
            type="button"
            onClick={() => setCampaignView("queue")}
            className={`tab-button ${campaignView === "queue" ? "tab-button-active" : ""}`}
          >
            Upcoming Queue
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {upcomingEmails.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCampaignView("templates")}
            className={`tab-button ${campaignView === "templates" ? "tab-button-active" : ""}`}
          >
            Campaign Templates
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {templates.length}
            </span>
          </button>
        </div>
      </div>

      {campaignView === "queue" ? (
        <div className="surface surface-pad">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-semibold">Upcoming Email Queue</h3>
              <p className="text-gray-500 text-xs mt-1">
                {queueLoading
                  ? "Checking scheduled recipients..."
                  : `${filteredUpcomingEmails.length} shown · ${upcomingEmails.length} total`}
              </p>
            </div>
            <button
              onClick={fetchUpcomingEmails}
              className="btn-secondary text-xs"
            >
              Refresh
            </button>
          </div>

          <div className="tab-row mb-4">
            {queueTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setQueueFilter(tab.value)}
                className={`tab-button text-xs ${queueFilter === tab.value ? "tab-button-active" : ""}`}
              >
                {tab.label}
                <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5">
                  {queueCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          {queueError ? (
            <div className="alert-error text-sm">
              {queueError}
            </div>
          ) : queueLoading ? (
            <div className="text-gray-500 text-sm py-6 text-center">Loading queue...</div>
          ) : filteredUpcomingEmails.length === 0 ? (
            <div className="text-gray-500 text-sm py-6 text-center">
              No {queueFilter === "all" ? "campaign sends" : queueFilter} emails found.
            </div>
          ) : (
            <div className="table-shell table-scroll shadow-none">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-gray-400 font-medium py-3 pr-4">Send Time</th>
                    <th className="text-left text-gray-400 font-medium py-3 pr-4">Campaign</th>
                    <th className="text-left text-gray-400 font-medium py-3 pr-4">Recipient</th>
                    <th className="text-left text-gray-400 font-medium py-3 pr-4">Status</th>
                    <th className="text-left text-gray-400 font-medium py-3">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUpcomingEmails.map((item) => (
                    <tr key={item.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-4 pr-4 text-white whitespace-nowrap">
                        {formatQueueDate(item.scheduledFor)}
                      </td>
                      <td className="py-4 pr-4 min-w-56">
                        <div className="text-white font-medium">{item.campaignName}</div>
                        <div className="text-gray-500 text-xs">
                          {item.stageLabel} · {item.source}
                        </div>
                        {item.subject ? (
                          <div className="text-gray-500 text-xs mt-1 truncate max-w-xs">
                            {item.subject}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 pr-4 min-w-52">
                        <div className="text-white">{item.recipientName}</div>
                        <div className="text-gray-500 text-xs">{item.recipientEmail}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full capitalize ${queueStatusClass(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 text-gray-400 text-xs max-w-sm">
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {queueNotes.length > 0 ? (
            <div className="mt-4 space-y-1">
              {queueNotes.slice(0, 3).map((note) => (
                <p key={note} className="text-yellow-300/80 text-xs">
                  {note}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="surface surface-pad flex items-center justify-between gap-4"
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
                  className="btn-secondary text-xs"
                >
                  {t.isActive ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => openEdit(t)}
                  className="btn-secondary text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {(editing || creating) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="surface surface-pad w-full max-w-3xl max-h-[90vh] overflow-auto">
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
                  className="form-field w-full px-4 py-2.5 text-sm"
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
                  className="form-field w-full px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-sm text-gray-400">
                    HTML Body
                  </label>
                  <button
                    type="button"
                    onClick={openProductPicker}
                    className="btn-secondary text-xs"
                  >
                    {productPickerOpen ? "Hide Products" : "Insert Product"}
                  </button>
                </div>

                {productPickerOpen && (
                  <div className="mb-3 rounded-lg border border-white/10 bg-gray-800/60 p-3">
                    {productPickerLoading ? (
                      <div className="text-gray-400 text-sm">
                        Loading products...
                      </div>
                    ) : productPickerError ? (
                      <div className="text-red-400 text-sm">
                        {productPickerError}
                      </div>
                    ) : productPicks.length === 0 ? (
                      <div className="text-gray-500 text-sm">
                        No active products found.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-auto custom-scrollbar">
                        {productPicks.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 rounded-lg bg-black/20 border border-white/[0.05] p-2"
                          >
                            <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden shrink-0">
                              {product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-white truncate">
                                {product.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {productPrice(product) || "No price"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => insertProduct(product)}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-white/5 text-gray-300 hover:bg-white/10"
                            >
                              Insert
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={form.htmlBody}
                  onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
                  rows={12}
                  placeholder="Paste your email HTML here..."
                  className="form-field w-full px-4 py-2.5 text-sm font-mono"
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
                className="btn-primary disabled:opacity-50"
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
