import { supabase } from "@/lib/supabase";
import { isShopifyConfigured } from "@/lib/shopify/client";
import {
  fetchHighValueCustomers,
  fetchOrdersPaginated,
  fetchRecentOrdersForFollowup,
  type ShopifyOrderSummary,
} from "@/lib/shopify/orders";

const DAY_MS = 1000 * 60 * 60 * 24;
const LOOKAHEAD_DAYS = 45;
const GRACE_DAYS = 2;

const ABANDONED_WAIT_DAYS: Record<number, number> = {
  0: 2,
  1: 3,
  2: 5,
};

const ABANDONED_STAGE_SLUGS: Record<number, string> = {
  1: "abandoned-cart-1",
  2: "abandoned-cart-2",
  3: "abandoned-cart-3",
};

const ABANDONED_STAGE_LABELS: Record<number, string> = {
  1: "Abandoned Cart #1",
  2: "Abandoned Cart #2",
  3: "Abandoned Cart #3",
};

const POST_PURCHASE_STAGES = [2, 5, 7, 14, 21, 30] as const;
const REENGAGEMENT_STAGES = [45, 60, 75, 90] as const;

interface TemplateRow {
  slug: string;
  subject: string;
  isActive: boolean;
}

interface DispatchRow {
  automationKey: string;
  stageKey: string;
  entityType: string;
  entityId: string;
}

interface AbandonedCartQueueRow {
  id: string;
  shopifyCheckoutId: string;
  customerEmail: string;
  customerFirstName: string | null;
  totalPrice: string | null;
  checkoutCreatedAt: string;
  lastContactedAt: string | null;
  currentStage: number;
  isRecovered: boolean;
  isCompleted: boolean;
}

interface AccessRequestQueueRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accessGrantedAt: string | null;
  reminderSentAt: string | null;
}

interface BirthdayQueueRow {
  email: string;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
}

export interface UpcomingEmailItem {
  id: string;
  campaignKey: string;
  campaignName: string;
  stageKey: string;
  stageLabel: string;
  recipientName: string;
  recipientEmail: string;
  subject: string | null;
  scheduledFor: string;
  status: "due" | "upcoming" | "blocked" | "missed";
  reason: string;
  source: string;
  entityType: string;
  entityId: string;
  details: Record<string, string | number | boolean | null>;
}

export interface UpcomingEmailsResult {
  items: UpcomingEmailItem[];
  count: number;
  generatedAt: string;
  notes: string[];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function withSendHour(date: Date): Date {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

function withinWindow(date: Date, now: Date): boolean {
  const lowerBound = addDays(now, -GRACE_DAYS);
  const upperBound = addDays(now, LOOKAHEAD_DAYS);
  return date >= lowerBound && date <= upperBound;
}

function statusFor(date: Date, now: Date): UpcomingEmailItem["status"] {
  if (date < addDays(now, -1)) return "missed";
  if (date <= now) return "due";
  return "upcoming";
}

function fullName(firstName?: string | null, lastName?: string | null): string {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || firstName || "Unknown";
}

function dispatchKey(
  automationKey: string,
  stageKey: string,
  entityType: string,
  entityId: string
): string {
  return `${automationKey}|${stageKey}|${entityType}|${entityId}`;
}

function getOrderEmail(order: ShopifyOrderSummary): string | null {
  return order.customer?.email || order.contact_email || order.email || null;
}

function getOrderName(order: ShopifyOrderSummary): string {
  return fullName(order.customer?.first_name, order.customer?.last_name);
}

function isHaircutOrder(order: ShopifyOrderSummary): boolean {
  return order.line_items
    .map((item) => item.title)
    .join(", ")
    .toLowerCase()
    .includes("haircut");
}

function templateMeta(templates: Map<string, TemplateRow>, slug: string) {
  return templates.get(slug) || null;
}

function addTemplateStatus(
  item: UpcomingEmailItem,
  templates: Map<string, TemplateRow>,
  slug: string
): UpcomingEmailItem {
  const template = templateMeta(templates, slug);

  if (!template) {
    return {
      ...item,
      status: "blocked",
      subject: null,
      reason: `${item.reason} Template is missing.`,
    };
  }

  if (!template.isActive) {
    return {
      ...item,
      status: "blocked",
      subject: template.subject,
      reason: `${item.reason} Template is disabled.`,
    };
  }

  return {
    ...item,
    subject: template.subject,
  };
}

async function getTemplates(): Promise<Map<string, TemplateRow>> {
  const { data, error } = await supabase
    .from("EmailTemplate")
    .select("slug, subject, isActive");

  if (error) throw error;

  return new Map((data || []).map((template) => [template.slug, template]));
}

async function getDispatches(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("AutomationDispatch")
    .select("automationKey, stageKey, entityType, entityId")
    .limit(10000);

  if (error) throw error;

  return new Set(
    ((data || []) as DispatchRow[]).map((dispatch) =>
      dispatchKey(
        dispatch.automationKey,
        dispatch.stageKey,
        dispatch.entityType,
        dispatch.entityId
      )
    )
  );
}

async function getAbandonedCartItems(
  templates: Map<string, TemplateRow>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const { data, error } = await supabase
    .from("AbandonedCartTracking")
    .select(
      "id, shopifyCheckoutId, customerEmail, customerFirstName, totalPrice, checkoutCreatedAt, lastContactedAt, currentStage, isRecovered, isCompleted"
    )
    .eq("isCompleted", false)
    .eq("isRecovered", false)
    .limit(250);

  if (error) throw error;

  return ((data || []) as AbandonedCartQueueRow[]).flatMap((cart) => {
    const nextStage = (cart.currentStage || 0) + 1;
    const slug = ABANDONED_STAGE_SLUGS[nextStage];
    if (!slug) return [];

    const basis =
      cart.currentStage === 0
        ? cart.checkoutCreatedAt
        : cart.lastContactedAt || cart.checkoutCreatedAt;
    const scheduledFor = withSendHour(
      addDays(new Date(basis), ABANDONED_WAIT_DAYS[cart.currentStage] || 5)
    );

    if (!withinWindow(scheduledFor, now)) return [];

    const item: UpcomingEmailItem = {
      id: `abandoned:${cart.id}:${nextStage}`,
      campaignKey: "abandoned_cart",
      campaignName: ABANDONED_STAGE_LABELS[nextStage],
      stageKey: `stage_${nextStage}`,
      stageLabel: `Stage ${nextStage}`,
      recipientName: cart.customerFirstName || "Unknown",
      recipientEmail: cart.customerEmail,
      subject: null,
      scheduledFor: scheduledFor.toISOString(),
      status: statusFor(scheduledFor, now),
      reason:
        cart.currentStage === 0
          ? "Checkout is waiting for first recovery email."
          : `Waiting ${ABANDONED_WAIT_DAYS[cart.currentStage] || 5} days after the previous cart email.`,
      source: "Abandoned cart recovery",
      entityType: "abandoned_cart",
      entityId: cart.id,
      details: {
        checkoutId: cart.shopifyCheckoutId,
        totalPrice: cart.totalPrice,
        currentStage: cart.currentStage,
      },
    };

    return [addTemplateStatus(item, templates, slug)];
  });
}

async function getAccessReminderItems(
  dispatches: Set<string>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const { data, error } = await supabase
    .from("AccessRequest")
    .select("id, firstName, lastName, email, accessGrantedAt, reminderSentAt")
    .not("accessGrantedAt", "is", null)
    .is("reminderSentAt", null)
    .limit(250);

  if (error) throw error;

  return ((data || []) as AccessRequestQueueRow[]).flatMap((request) => {
    if (!request.accessGrantedAt) return [];

    const stageKey = "reminder";
    if (
      dispatches.has(
        dispatchKey("access_request", stageKey, "access_request", request.id)
      )
    ) {
      return [];
    }

    const scheduledFor = withSendHour(addDays(new Date(request.accessGrantedAt), 2));
    if (!withinWindow(scheduledFor, now)) return [];

    return [
      {
        id: `access:${request.id}`,
        campaignKey: "access_request",
        campaignName: "Members Access Reminder",
        stageKey,
        stageLabel: "Reminder",
        recipientName: fullName(request.firstName, request.lastName),
        recipientEmail: request.email,
        subject: "Still want members-only access?",
        scheduledFor: scheduledFor.toISOString(),
        status: statusFor(scheduledFor, now),
        reason:
          "Access was granted and no reminder has been recorded yet. The send job skips anyone who already ordered after access was granted.",
        source: "Access requests",
        entityType: "access_request",
        entityId: request.id,
        details: {
          accessGrantedAt: request.accessGrantedAt,
        },
      },
    ];
  });
}

function birthdayThisYear(value: string, year: number): Date {
  const birthday = new Date(value);
  return new Date(year, birthday.getMonth(), birthday.getDate());
}

async function getBirthdayItems(
  dispatches: Set<string>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const { data, error } = await supabase
    .from("CustomerProfile")
    .select("email, firstName, lastName, birthday")
    .not("birthday", "is", null)
    .limit(1000);

  if (error) throw error;

  const stages = [
    { stage: "pre", label: "Birthday Preview", offset: -2 },
    { stage: "day", label: "Birthday Gift", offset: 0 },
    { stage: "last_call", label: "Birthday Last Call", offset: 2 },
  ];

  return ((data || []) as BirthdayQueueRow[]).flatMap((profile) => {
    if (!profile.birthday) return [];

    const items: UpcomingEmailItem[] = [];

    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const birthday = birthdayThisYear(profile.birthday, year);

      for (const stage of stages) {
        const stageKey = `${stage.stage}_${year}`;
        if (
          dispatches.has(
            dispatchKey("birthday", stageKey, "customer", profile.email)
          )
        ) {
          continue;
        }

        const scheduledFor = withSendHour(addDays(birthday, stage.offset));
        if (!withinWindow(scheduledFor, now)) continue;

        items.push({
          id: `birthday:${profile.email}:${stageKey}`,
          campaignKey: "birthday",
          campaignName: stage.label,
          stageKey,
          stageLabel: stage.label,
          recipientName: fullName(profile.firstName, profile.lastName),
          recipientEmail: profile.email,
          subject:
            stage.stage === "pre"
              ? "Yo! Birthday Is Almost Here"
              : stage.stage === "day"
                ? "Happy Birthday"
                : "Last chance to use Yo! birthday gift",
          scheduledFor: scheduledFor.toISOString(),
          status: statusFor(scheduledFor, now),
          reason: "Birthday date matches this campaign window.",
          source: "Birthday automation",
          entityType: "customer",
          entityId: profile.email,
          details: {
            birthday: profile.birthday,
          },
        });
      }
    }

    return items;
  });
}

async function getPostPurchaseItems(
  dispatches: Set<string>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const since = addDays(now, -35);
  const orders = await fetchRecentOrdersForFollowup(since);
  const items: UpcomingEmailItem[] = [];

  for (const order of orders) {
    const email = getOrderEmail(order);
    if (!email || order.fulfillment_status !== "fulfilled" || isHaircutOrder(order)) {
      continue;
    }

    for (const stage of POST_PURCHASE_STAGES) {
      const stageKey = `day_${stage}`;
      const entityId = String(order.id);
      if (
        dispatches.has(
          dispatchKey("post_purchase", stageKey, "order", entityId)
        )
      ) {
        continue;
      }

      const scheduledFor = withSendHour(addDays(new Date(order.created_at), stage));
      if (!withinWindow(scheduledFor, now)) continue;

      items.push({
        id: `post:${order.id}:${stageKey}`,
        campaignKey: "post_purchase",
        campaignName: `Post-Purchase Day ${stage}`,
        stageKey,
        stageLabel: `Day ${stage}`,
        recipientName: getOrderName(order),
        recipientEmail: email,
        subject: null,
        scheduledFor: scheduledFor.toISOString(),
        status: statusFor(scheduledFor, now),
        reason: `Fulfilled order reaches day ${stage}.`,
        source: "Post-purchase follow-up",
        entityType: "order",
        entityId,
        details: {
          orderId: order.id,
          orderCreatedAt: order.created_at,
          totalPrice: order.total_price || null,
        },
      });
      break;
    }
  }

  return items;
}

async function getReengagementItems(
  dispatches: Set<string>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const createdAtMin = addDays(now, -95);
  const createdAtMax = addDays(now, -35);
  const params = new URLSearchParams({
    status: "any",
    created_at_min: createdAtMin.toISOString(),
    created_at_max: createdAtMax.toISOString(),
    limit: "250",
    fields: [
      "id",
      "email",
      "contact_email",
      "customer",
      "created_at",
      "updated_at",
      "fulfillment_status",
      "financial_status",
      "total_price",
      "line_items",
    ].join(","),
  });

  const orders = await fetchOrdersPaginated(params);
  const ordersByEmail = new Map<string, ShopifyOrderSummary[]>();

  for (const order of orders) {
    const email = getOrderEmail(order);
    if (!email || isHaircutOrder(order)) continue;
    ordersByEmail.set(email, [...(ordersByEmail.get(email) || []), order]);
  }

  const items: UpcomingEmailItem[] = [];

  for (const [email, customerOrders] of ordersByEmail.entries()) {
    if (customerOrders.length !== 1) continue;
    const order = customerOrders[0];

    for (const stage of REENGAGEMENT_STAGES) {
      const stageKey = `day_${stage}`;
      if (
        dispatches.has(
          dispatchKey("reengagement", stageKey, "customer", email)
        )
      ) {
        continue;
      }

      const scheduledFor = withSendHour(addDays(new Date(order.created_at), stage));
      if (!withinWindow(scheduledFor, now)) continue;

      items.push({
        id: `reengagement:${email}:${stageKey}`,
        campaignKey: "reengagement",
        campaignName: `Re-engagement Day ${stage}`,
        stageKey,
        stageLabel: `Day ${stage}`,
        recipientName: getOrderName(order),
        recipientEmail: email,
        subject: null,
        scheduledFor: scheduledFor.toISOString(),
        status: statusFor(scheduledFor, now),
        reason: `Customer has one qualifying order and reaches day ${stage} without another tracked purchase.`,
        source: "Re-engagement",
        entityType: "customer",
        entityId: email,
        details: {
          orderId: order.id,
          orderCreatedAt: order.created_at,
          daysSinceOrder: daysBetween(now, new Date(order.created_at)),
        },
      });
      break;
    }
  }

  return items;
}

function nextMondayAfternoon(now: Date): Date {
  const date = new Date(now);
  const day = date.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(14, 0, 0, 0);
  return date;
}

function vipTier(amountSpent: number): string | null {
  if (amountSpent >= 2000) return "legend";
  if (amountSpent >= 1000) return "all_star";
  if (amountSpent >= 500) return "mvp";
  return null;
}

async function getVipItems(
  dispatches: Set<string>,
  now: Date
): Promise<UpcomingEmailItem[]> {
  const customers = await fetchHighValueCustomers();
  const scheduledFor = nextMondayAfternoon(now);

  return customers.flatMap((customer) => {
    const tier = vipTier(customer.amountSpent);
    if (!tier) return [];

    if (
      dispatches.has(
        dispatchKey("vip_recognition", tier, "customer", customer.email)
      )
    ) {
      return [];
    }

    return [
      {
        id: `vip:${customer.email}:${tier}`,
        campaignKey: "vip_recognition",
        campaignName: `VIP ${tier.replace(/_/g, " ")}`,
        stageKey: tier,
        stageLabel: tier.replace(/_/g, " "),
        recipientName: fullName(customer.firstName, customer.lastName),
        recipientEmail: customer.email,
        subject: null,
        scheduledFor: scheduledFor.toISOString(),
        status: statusFor(scheduledFor, now),
        reason: `Customer has spent $${customer.amountSpent.toFixed(2)}.`,
        source: "VIP recognition",
        entityType: "customer",
        entityId: customer.email,
        details: {
          amountSpent: customer.amountSpent,
          numberOfOrders: customer.numberOfOrders,
        },
      },
    ];
  });
}

export async function getUpcomingEmails(
  limit = 50
): Promise<UpcomingEmailsResult> {
  const now = new Date();
  const notes: string[] = [];
  const [templates, dispatches] = await Promise.all([
    getTemplates(),
    getDispatches(),
  ]);

  const groups = await Promise.allSettled([
    getAbandonedCartItems(templates, now),
    getAccessReminderItems(dispatches, now),
    getBirthdayItems(dispatches, now),
  ]);

  const items = groups.flatMap((group) => {
    if (group.status === "fulfilled") return group.value;
    notes.push(group.reason instanceof Error ? group.reason.message : String(group.reason));
    return [];
  });

  if (isShopifyConfigured()) {
    const shopifyGroups = await Promise.allSettled([
      getPostPurchaseItems(dispatches, now),
      getReengagementItems(dispatches, now),
      getVipItems(dispatches, now),
    ]);

    for (const group of shopifyGroups) {
      if (group.status === "fulfilled") {
        items.push(...group.value);
      } else {
        notes.push(
          group.reason instanceof Error ? group.reason.message : String(group.reason)
        );
      }
    }
  } else {
    notes.push("Shopify is not configured, so Shopify-dependent campaign queues are hidden.");
  }

  const sorted = items
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    )
    .slice(0, Math.max(1, Math.min(limit, 100)));

  return {
    items: sorted,
    count: sorted.length,
    generatedAt: now.toISOString(),
    notes,
  };
}
