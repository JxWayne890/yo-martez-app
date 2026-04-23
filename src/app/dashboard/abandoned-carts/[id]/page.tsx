"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface LineItem {
  title: string;
  variant: string | null;
  quantity: number;
  price: string;
}

interface Cart {
  id: string;
  shopifyCheckoutId: string;
  shopifyCheckoutToken: string | null;
  customerEmail: string;
  customerFirstName: string | null;
  abandonedCheckoutUrl: string;
  totalPrice: string | null;
  lineItems: LineItem[];
  checkoutCreatedAt: string;
  timesContacted: number;
  lastContactedAt: string | null;
  currentStage: number;
  isRecovered: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingState: string | null;
  vipTier: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface StageEmail {
  id: string;
  eventType: string;
  emailSent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface OtherCart {
  id: string;
  shopifyCheckoutId: string;
  totalPrice: string | null;
  checkoutCreatedAt: string;
  isRecovered: boolean;
  isCompleted: boolean;
}

interface CartData {
  cart: Cart;
  profile: Profile | null;
  stageEmails: StageEmail[];
  otherCartsForCustomer: OtherCart[];
}

const STAGE_TEMPLATES = [
  { stage: 1, slug: "abandoned-cart-1", label: "Stage 1 — Yo! Cart's still waiting" },
  { stage: 2, slug: "abandoned-cart-2", label: "Stage 2 — Still thinking it over?" },
  { stage: 3, slug: "abandoned-cart-3", label: "Stage 3 — Last call + YO10 discount" },
];

function formatMoney(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (n === null || n === undefined || isNaN(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AbandonedCartDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/abandoned-carts/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load cart");
        }
        return r.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load cart"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-gray-400 text-center mt-20">Loading cart...</div>;
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-red-400 font-bold mb-1 text-lg">Unable to load cart</h3>
        <p className="text-red-400/80 text-sm">{error}</p>
        <Link
          href="/dashboard/abandoned-carts"
          className="inline-block mt-4 text-purple-400 hover:text-purple-300 text-sm"
        >
          ← Back to abandoned carts
        </Link>
      </div>
    );
  }

  const { cart, profile, stageEmails, otherCartsForCustomer } = data;

  const fullName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
      : cart.customerFirstName || cart.customerEmail;
  const initial = (fullName || cart.customerEmail)[0]?.toUpperCase() || "?";

  const totalItems = cart.lineItems.reduce((sum, li) => sum + li.quantity, 0);

  const statusBadge = cart.isRecovered ? (
    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
      Recovered
    </span>
  ) : cart.isCompleted ? (
    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-600/30 text-gray-400 border border-gray-600/40">
      Exhausted
    </span>
  ) : (
    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
      Pending
    </span>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <Link
        href="/dashboard/abandoned-carts"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        ← Back to abandoned carts
      </Link>

      {/* Header */}
      <div className="bg-[#1a1a24]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/[0.05] p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-4xl font-bold text-white shrink-0 shadow-lg">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {statusBadge}
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                Stage {cart.currentStage} / 3
              </span>
              {profile?.vipTier && (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  VIP: {profile.vipTier}
                </span>
              )}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white truncate">
              {fullName}
            </h2>
            <Link
              href={`/dashboard/customers/${encodeURIComponent(cart.customerEmail)}`}
              className="text-purple-400 hover:text-purple-300 mt-1 truncate block text-sm"
            >
              {cart.customerEmail} →
            </Link>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={cart.abandonedCheckoutUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-500 transition-colors"
              >
                Open checkout link ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Cart Total", value: formatMoney(cart.totalPrice) },
          { label: "Items", value: totalItems },
          { label: "Times Contacted", value: cart.timesContacted },
          {
            label: "Customer Lifetime Value",
            value: profile ? formatMoney(profile.totalSpent) : "—",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg"
          >
            <div className="text-sm font-medium text-gray-400 mb-2">
              {stat.label}
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-white">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Cart details + timeline side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Cart Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Abandoned</dt>
              <dd className="text-white text-right">
                {formatDateTime(cart.checkoutCreatedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Last contacted</dt>
              <dd className="text-white text-right">
                {formatDateTime(cart.lastContactedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Shopify checkout ID</dt>
              <dd className="text-white text-right font-mono text-xs">
                {cart.shopifyCheckoutId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">First tracked</dt>
              <dd className="text-white text-right">
                {formatDateTime(cart.createdAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Last updated</dt>
              <dd className="text-white text-right">
                {formatDateTime(cart.updatedAt)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Recovery Timeline</h3>
          <div className="space-y-3">
            {STAGE_TEMPLATES.map((template) => {
              const sentEvent = stageEmails.find(
                (e) => e.emailSent === template.slug
              );
              const isCurrentOrPast = cart.currentStage >= template.stage;
              const isSent = Boolean(sentEvent);

              return (
                <div
                  key={template.stage}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    isSent
                      ? "bg-purple-500/10 border-purple-500/30"
                      : isCurrentOrPast
                      ? "bg-white/[0.02] border-white/[0.05]"
                      : "bg-white/[0.01] border-white/[0.03]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSent
                        ? "bg-purple-500 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {template.stage}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold ${
                        isSent ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {template.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {isSent
                        ? `Sent ${formatDateTime(sentEvent!.createdAt)}`
                        : "Not yet sent"}
                    </div>
                  </div>
                </div>
              );
            })}
            {cart.isRecovered && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">
                    Cart recovered
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Customer completed the checkout
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg mb-8">
        <h3 className="text-lg font-bold text-white mb-4">
          Items in Cart ({cart.lineItems.length})
        </h3>
        {cart.lineItems.length === 0 ? (
          <p className="text-gray-500 text-sm">No line items on this cart.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[0.05]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Product</th>
                  <th className="text-left text-gray-400 font-medium px-5 py-3">Variant</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Qty</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Price</th>
                  <th className="text-right text-gray-400 font-medium px-5 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {cart.lineItems.map((li, i) => {
                  const price = parseFloat(li.price) || 0;
                  return (
                    <tr
                      key={i}
                      className="border-t border-white/[0.05]"
                    >
                      <td className="px-5 py-3 text-white">{li.title}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {li.variant || "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-300">
                        {li.quantity}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-300">
                        {formatMoney(li.price)}
                      </td>
                      <td className="px-5 py-3 text-right text-white font-semibold">
                        {formatMoney(price * li.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.1] bg-white/[0.02]">
                  <td colSpan={4} className="px-5 py-3 text-right text-gray-400 font-medium">
                    Cart total
                  </td>
                  <td className="px-5 py-3 text-right text-white font-extrabold">
                    {formatMoney(cart.totalPrice)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Customer panel */}
      {profile && (
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Customer</h3>
            <Link
              href={`/dashboard/customers/${encodeURIComponent(profile.email)}`}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              View full profile →
            </Link>
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-gray-400 mb-1">Marketing</dt>
              <dd className="text-white capitalize">
                {profile.marketingState || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-400 mb-1">Phone</dt>
              <dd className="text-white">{profile.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400 mb-1">Total orders</dt>
              <dd className="text-white">{profile.orderCount}</dd>
            </div>
            <div>
              <dt className="text-gray-400 mb-1">Last order</dt>
              <dd className="text-white">
                {formatDate(profile.lastOrderAt)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Other carts from this customer */}
      {otherCartsForCustomer.length > 0 && (
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">
            Other Abandoned Carts from This Customer ({otherCartsForCustomer.length})
          </h3>
          <div className="space-y-2">
            {otherCartsForCustomer.map((other) => (
              <Link
                key={other.id}
                href={`/dashboard/abandoned-carts/${other.id}`}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
              >
                <div>
                  <div className="text-white font-semibold">
                    {formatMoney(other.totalPrice)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDateTime(other.checkoutCreatedAt)}
                  </div>
                </div>
                {other.isRecovered ? (
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Recovered
                  </span>
                ) : other.isCompleted ? (
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-600/30 text-gray-400 border border-gray-600/40">
                    Exhausted
                  </span>
                ) : (
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    Pending
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
