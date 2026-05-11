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
                <div className="flex items-center justify-between gap-3 mb-1">
                  <label className="block text-sm text-gray-400">
                    HTML Body
                  </label>
                  <button
                    type="button"
                    onClick={openProductPicker}
                    className="px-3 py-1.5 text-xs rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600/30"
                  >
                    {productPickerOpen ? "Hide Products" : "Insert Product"}
                  </button>
                </div>

                {productPickerOpen && (
                  <div className="mb-3 rounded-xl border border-white/10 bg-gray-800/60 p-3">
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
