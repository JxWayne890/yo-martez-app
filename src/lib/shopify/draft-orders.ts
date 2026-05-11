import { shopifyFetch } from "./client";
import { logger } from "@/lib/logger";
import type { ShopifyDraftOrder } from "@/types/shopify";
import type { MatchedLineItem } from "@/types/workflows";

interface ShopifyDraftOrderResponse {
  draft_orders: Array<{
    id: number;
    name?: string | null;
    email?: string | null;
    status?: string | null;
    invoice_url?: string | null;
    invoice_sent_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    currency?: string | null;
    total_price?: string | null;
    subtotal_price?: string | null;
    total_tax?: string | null;
    note?: string | null;
    tags?: string | null;
    customer?: {
      id?: number | null;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    line_items?: Array<{
      id?: number | null;
      title?: string | null;
      variant_title?: string | null;
      quantity?: number | null;
      price?: string | null;
      sku?: string | null;
    }>;
  }>;
}

export interface ShopifyDraftOrderDashboardItem {
  id: number;
  name: string;
  email: string | null;
  customerName: string | null;
  customerId: number | null;
  status: string;
  invoiceUrl: string | null;
  invoiceSentAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  currency: string;
  totalPrice: string | null;
  subtotalPrice: string | null;
  totalTax: string | null;
  note: string | null;
  tags: string[];
  lineItemCount: number;
  lineItems: Array<{
    title: string;
    variant: string | null;
    quantity: number;
    price: string | null;
    sku: string | null;
  }>;
}

function normalizeTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function createDraftOrder(
  customerEmail: string,
  customerName: string,
  lineItems: MatchedLineItem[]
): Promise<ShopifyDraftOrder> {
  const response = await shopifyFetch<{ draft_order: ShopifyDraftOrder }>(
    "/draft_orders.json",
    {
      method: "POST",
      body: JSON.stringify({
        draft_order: {
          email: customerEmail,
          note: `Customer: ${customerName}`,
          line_items: lineItems.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        },
      }),
    }
  );

  logger.info("Draft order created", {
    draftOrderId: response.draft_order.id,
    email: customerEmail,
  });

  return response.draft_order;
}

export async function sendDraftOrderInvoice(
  draftOrderId: number,
  customerEmail: string,
  customerFirstName: string
): Promise<void> {
  await shopifyFetch(
    `/draft_orders/${draftOrderId}/send_invoice.json`,
    {
      method: "POST",
      body: JSON.stringify({
        draft_order_invoice: {
          to: customerEmail,
          subject: "Yo! Invoice",
          custom_message: `${customerFirstName}, we got you squared away, now you're one step closer to gaining full access as a VIP community member.`,
        },
      }),
    }
  );

  logger.info("Draft order invoice sent", {
    draftOrderId,
    email: customerEmail,
  });
}

export async function fetchDraftOrdersForDashboard({
  status,
  limit = 100,
}: {
  status?: string | null;
  limit?: number;
} = {}): Promise<ShopifyDraftOrderDashboardItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const params = new URLSearchParams({
    limit: String(safeLimit),
    fields: [
      "id",
      "name",
      "email",
      "status",
      "invoice_url",
      "invoice_sent_at",
      "completed_at",
      "created_at",
      "updated_at",
      "currency",
      "total_price",
      "subtotal_price",
      "total_tax",
      "note",
      "tags",
      "customer",
      "line_items",
    ].join(","),
  });

  if (status && status !== "all") {
    params.set("status", status);
  }

  const response = await shopifyFetch<ShopifyDraftOrderResponse>(
    `/draft_orders.json?${params.toString()}`
  );

  return response.draft_orders.map((draft) => {
    const lineItems = draft.line_items || [];
    const customerName = [
      draft.customer?.first_name || "",
      draft.customer?.last_name || "",
    ]
      .join(" ")
      .trim();

    return {
      id: draft.id,
      name: draft.name || `#D${draft.id}`,
      email: draft.email || draft.customer?.email || null,
      customerName: customerName || null,
      customerId: draft.customer?.id || null,
      status: draft.status || "unknown",
      invoiceUrl: draft.invoice_url || null,
      invoiceSentAt: draft.invoice_sent_at || null,
      completedAt: draft.completed_at || null,
      createdAt: draft.created_at || null,
      updatedAt: draft.updated_at || null,
      currency: draft.currency || "USD",
      totalPrice: draft.total_price || null,
      subtotalPrice: draft.subtotal_price || null,
      totalTax: draft.total_tax || null,
      note: draft.note || null,
      tags: normalizeTags(draft.tags),
      lineItemCount: lineItems.reduce(
        (sum, item) => sum + (item.quantity || 0),
        0
      ),
      lineItems: lineItems.map((item) => ({
        title: item.title || "Untitled item",
        variant: item.variant_title || null,
        quantity: item.quantity || 0,
        price: item.price || null,
        sku: item.sku || null,
      })),
    };
  });
}
