"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EmailPreviewModal } from "@/components/email-preview-modal";

interface CustomerProfile {
  id: string;
  email: string;
  shopifyCustomerId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  marketingState: string | null;
  birthday: string | null;
  birthdaySource: string | null;
  membersAccessGrantedAt: string | null;
  vipTier: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface OrderLineItem {
  title: string;
  variant: string | null;
  quantity: number;
  price: string;
}

interface Order {
  id: number;
  createdAt: string;
  total: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  lineItems: OrderLineItem[];
}

interface AbandonedCart {
  id: string;
  shopifyCheckoutId: string;
  abandonedCheckoutUrl: string;
  totalPrice: string | null;
  lineItems: OrderLineItem[];
  checkoutCreatedAt: string;
  timesContacted: number;
  lastContactedAt: string | null;
  currentStage: number;
  isRecovered: boolean;
  isCompleted: boolean;
}

interface CustomerEvent {
  id: string;
  eventType: string;
  emailSent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface EmailSent {
  template: string;
  eventType: string;
  sentAt: string;
}

interface ProfileData {
  email: string;
  profile: CustomerProfile | null;
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalEvents: number;
    totalEmailsReceived: number;
    abandonedCartCount: number;
    recoveredCartCount: number;
  };
  orders: Order[];
  abandonedCarts: AbandonedCart[];
  events: CustomerEvent[];
  emailsSent: EmailSent[];
  lastEmailSent: EmailSent | null;
  campaignsReceived: string[];
}

const templateLabels: Record<string, string> = {
  welcome: "Welcome",
  farewell: "Unsubscribe",
  "abandoned-cart-1": "Abandoned Cart #1",
  "abandoned-cart-2": "Abandoned Cart #2",
  "abandoned-cart-3": "Abandoned Cart #3",
  "reengagement-45": "Re-engagement Day 45",
  "reengagement-60": "Re-engagement Day 60",
  "reengagement-75": "Re-engagement Day 75",
  "reengagement-90": "Re-engagement Day 90",
};

const eventTypeLabels: Record<string, string> = {
  customer_imported: "Imported from Shopify",
  customer_created: "New customer",
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  abandoned_cart: "Abandoned cart email",
  reengagement: "Re-engagement email",
  post_purchase_followup: "Post-purchase followup",
  birthday: "Birthday email",
  vip_recognition: "VIP recognition",
  access_request: "Access request submitted",
  access_granted: "Access granted",
};

function formatMoney(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CustomerProfilePage() {
  const params = useParams<{ email: string }>();
  const emailParam = params.email;
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ slug: string; sentAt?: string } | null>(null);

  useEffect(() => {
    fetch(`/api/dashboard/customers/${emailParam}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load profile");
        }
        return r.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => setError(err.message || "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [emailParam]);

  if (loading) {
    return (
      <div className="text-gray-400 text-center mt-20">
        Loading customer profile...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 backdrop-blur-md">
        <h3 className="text-red-400 font-bold mb-1 text-lg">
          Unable to load profile
        </h3>
        <p className="text-red-400/80 text-sm">{error}</p>
        <Link
          href="/dashboard/customers"
          className="inline-block mt-4 text-purple-400 hover:text-purple-300 text-sm"
        >
          ← Back to customers
        </Link>
      </div>
    );
  }

  const { profile, stats, orders, abandonedCarts, events, emailsSent, lastEmailSent, campaignsReceived } = data;
  const fullName =
    profile && (profile.firstName || profile.lastName)
      ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
      : data.email;
  const initial = (fullName || data.email)[0]?.toUpperCase() || "?";

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        ← Back to customers
      </Link>

      {/* Header card */}
      <div className="bg-[#1a1a24]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/[0.05] p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl font-bold text-white shrink-0 shadow-lg">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-white truncate">
              {fullName}
            </h2>
            <p className="text-gray-400 mt-1 truncate">{data.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {profile?.marketingState && (
                <span
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                    profile.marketingState === "subscribed"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-gray-700 text-gray-300 border-gray-600"
                  }`}
                >
                  {profile.marketingState}
                </span>
              )}
              {profile?.vipTier && (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                  VIP: {profile.vipTier}
                </span>
              )}
              {profile?.membersAccessGrantedAt && (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Members access granted
                </span>
              )}
              {profile?.phone && (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                  {profile.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Orders", value: stats.totalOrders },
          { label: "Total Spent", value: formatMoney(stats.totalSpent) },
          { label: "Emails Received", value: stats.totalEmailsReceived },
          { label: "Abandoned Carts", value: stats.abandonedCartCount },
          { label: "Cart Recoveries", value: stats.recoveredCartCount },
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

      {/* Details & last email side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Profile</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Birthday</dt>
              <dd className="text-white text-right">
                {formatDate(profile?.birthday || null)}
                {profile?.birthdaySource ? (
                  <span className="text-gray-500 text-xs ml-2">
                    ({profile.birthdaySource})
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Shopify ID</dt>
              <dd className="text-white text-right font-mono text-xs">
                {profile?.shopifyCustomerId || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Last order</dt>
              <dd className="text-white text-right">
                {formatDate(profile?.lastOrderAt || null)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Members access granted</dt>
              <dd className="text-white text-right">
                {formatDate(profile?.membersAccessGrantedAt || null)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">Last Email Sent</h3>
          {lastEmailSent ? (
            <div>
              <div className="text-xl font-semibold text-white mb-1">
                {templateLabels[lastEmailSent.template] || lastEmailSent.template}
              </div>
              <div className="text-sm text-gray-400 mb-3">
                {eventTypeLabels[lastEmailSent.eventType] || lastEmailSent.eventType}
              </div>
              <div className="text-sm text-gray-500">
                Sent {formatDateTime(lastEmailSent.sentAt)}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              No emails have been sent to this customer yet.
            </p>
          )}

          {campaignsReceived.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/[0.05]">
              <div className="text-sm font-medium text-gray-400 mb-3">
                Campaigns received
              </div>
              <div className="flex flex-wrap gap-2">
                {campaignsReceived.map((slug) => (
                  <span
                    key={slug}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                  >
                    {templateLabels[slug] || slug}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Abandoned carts */}
      {abandonedCarts.length > 0 && (
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg mb-8">
          <h3 className="text-lg font-bold text-white mb-4">
            Abandoned Carts ({abandonedCarts.length})
          </h3>
          <div className="space-y-3">
            {abandonedCarts.map((cart) => (
              <div
                key={cart.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">
                      {formatMoney(cart.totalPrice)} —{" "}
                      {cart.lineItems.length} item
                      {cart.lineItems.length !== 1 ? "s" : ""}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Abandoned {formatDateTime(cart.checkoutCreatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-gray-300 border border-white/10">
                      Stage {cart.currentStage} / 3
                    </span>
                    {cart.isRecovered ? (
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
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-400">
                  {cart.lineItems.map((li, i) => (
                    <li key={i}>
                      {li.quantity}× {li.title}
                      {li.variant ? ` — ${li.variant}` : ""} @{" "}
                      {formatMoney(li.price)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchase history */}
      <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg mb-8">
        <h3 className="text-lg font-bold text-white mb-4">
          Purchase History ({orders.length})
        </h3>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No orders on file for this customer.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">
                      Order #{order.id} — {formatMoney(order.total)}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.financialStatus && (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 text-gray-300 border border-white/10 capitalize">
                        {order.financialStatus}
                      </span>
                    )}
                    {order.fulfillmentStatus && (
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 capitalize">
                        {order.fulfillmentStatus}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-gray-400">
                  {order.lineItems.map((li, i) => (
                    <li key={i}>
                      {li.quantity}× {li.title}
                      {li.variant ? ` — ${li.variant}` : ""} @{" "}
                      {formatMoney(li.price)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email history */}
      {emailsSent.length > 0 && (
        <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg mb-8">
          <h3 className="text-lg font-bold text-white mb-4">
            Email History ({emailsSent.length})
          </h3>
          <div className="space-y-2">
            {emailsSent.map((email, i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setPreview({ slug: email.template, sentAt: email.sentAt })
                }
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-purple-500/30 transition-colors text-left cursor-pointer"
              >
                <div>
                  <div className="text-white font-semibold">
                    {templateLabels[email.template] || email.template}
                  </div>
                  <div className="text-sm text-gray-500">
                    {eventTypeLabels[email.eventType] || email.eventType} — click to preview
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDateTime(email.sentAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <EmailPreviewModal
          slug={preview.slug}
          email={data.email}
          sentAt={preview.sentAt}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Full event timeline */}
      <div className="rounded-2xl p-6 bg-[#1a1a24]/80 backdrop-blur-xl border border-white/[0.05] shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">
          Event Timeline ({events.length})
        </h3>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No recorded events.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {eventTypeLabels[event.eventType] || event.eventType}
                  </span>
                  {event.emailSent && (
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {templateLabels[event.emailSent] || event.emailSent}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDateTime(event.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
