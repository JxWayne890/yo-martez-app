"use client";

import { useEffect, useMemo, useState } from "react";

interface ProductVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  inventoryQuantity: number | null;
  inventoryPolicy: string | null;
  options: string[];
}

interface Product {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  updatedAt: string | null;
  image: string | null;
  productUrl: string;
  variantCount: number;
  totalInventory: number | null;
  minPrice: string | null;
  maxPrice: string | null;
  variants: ProductVariant[];
}

const statusFilters = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

function money(amount: string | null): string {
  if (!amount) return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function priceRange(product: Product): string {
  if (!product.minPrice) return "—";
  if (!product.maxPrice || product.minPrice === product.maxPrice) {
    return money(product.minPrice);
  }
  return `${money(product.minPrice)} - ${money(product.maxPrice)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function productEmailBlock(product: Product): string {
  const title = escapeHtml(product.title);
  const url = escapeHtml(product.productUrl);
  const image = escapeHtml(product.image || "");
  const price = escapeHtml(priceRange(product));

  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:24px 0;">
  <tr>
    <td style="padding:16px;text-align:center;">
      <a href="${url}" target="_blank">
        <img src="${image}" alt="${title}" style="width:100%;max-width:260px;border-radius:8px;" />
      </a>
      <h3 style="font-size:18px;margin:14px 0 6px;">${title}</h3>
      <p style="font-size:15px;margin:0 0 14px;color:#555;">${price}</p>
      <a href="${url}" style="display:inline-block;background:#8A2BE2;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Shop Now</a>
    </td>
  </tr>
</table>`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = () => {
    setRefreshing(true);
    const params = new URLSearchParams({
      status,
      query,
      limit: "250",
    });

    fetch(`/api/dashboard/products?${params.toString()}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load products");
        }
        return data;
      })
      .then((data) => {
        setProducts(data.products || []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load products");
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    const timeout = window.setTimeout(load, 250);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, query]);

  const totals = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc.variants += product.variantCount;
        if (product.totalInventory !== null) {
          acc.inventory += product.totalInventory;
          acc.hasInventory = true;
        }
        return acc;
      },
      { variants: 0, inventory: 0, hasInventory: false }
    );
  }, [products]);

  const copyBlock = async (product: Product) => {
    await navigator.clipboard.writeText(productEmailBlock(product));
    setCopiedId(product.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            Products
          </h2>
          <p className="page-subtitle">
            Shopify catalog for campaign picks, draft matching, and quick checks.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="btn-secondary disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="metric-label">Products Shown</div>
          <div className="metric-value">
            {products.length}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Variants</div>
          <div className="metric-value">
            {totals.variants}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Inventory Visible</div>
          <div className="metric-value">
            {totals.hasInventory ? totals.inventory : "—"}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="tab-row">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              className={`tab-button ${status === filter.value ? "tab-button-active" : ""}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, tag, SKU, type..."
          className="form-field lg:ml-auto w-full lg:max-w-sm px-4 py-2.5 text-sm placeholder:text-gray-600"
        />
      </div>

      {loading ? (
        <div className="text-gray-400 text-center mt-16">
          Loading products...
        </div>
      ) : error ? (
        <div className="alert-error">
          <h3 className="text-red-400 font-bold mb-1 text-lg">
            Unable to load products
          </h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p className="text-gray-500 text-sm">
            No products found for this view.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="surface overflow-hidden flex flex-col sm:flex-row"
            >
              <div className="w-full sm:w-44 h-44 sm:h-auto bg-black/30 shrink-0">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">
                      {product.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1">
                      {product.productType || product.vendor || product.handle}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg capitalize ${
                      product.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : product.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-600/20 text-gray-400"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div>
                    <div className="text-xs text-gray-500">Price</div>
                    <div className="text-white font-semibold">
                      {priceRange(product)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Variants</div>
                    <div className="text-white font-semibold">
                      {product.variantCount}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Inventory</div>
                    <div className="text-white font-semibold">
                      {product.totalInventory ?? "—"}
                    </div>
                  </div>
                </div>

                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-1 rounded-lg bg-white/5 text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-black/20 border border-white/[0.05] p-3">
                  <div className="text-xs text-gray-500 mb-2">
                    Variant quick view
                  </div>
                  <div className="space-y-1.5 max-h-24 overflow-auto custom-scrollbar">
                    {product.variants.slice(0, 4).map((variant) => (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="text-gray-300 truncate">
                          {variant.title}
                          {variant.sku ? (
                            <span className="text-gray-600"> · {variant.sku}</span>
                          ) : null}
                        </span>
                        <span className="text-gray-400 shrink-0">
                          {money(variant.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs"
                  >
                    View
                  </a>
                  <button
                    onClick={() => copyBlock(product)}
                    className="btn-primary text-xs"
                  >
                    {copiedId === product.id ? "Copied" : "Copy Email Block"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
