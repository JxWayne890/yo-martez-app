import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import {
  buildAccessGrantedEmail,
  buildAccessRequestEmail,
  buildMembersReminderEmail,
} from "@/lib/email/automation-templates";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { hasOrderSince } from "@/lib/shopify/orders";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

const DEFAULT_MEMBERS_PASSWORD = process.env.MEMBERS_STORE_PASSWORD || "Yo!1500";

interface AccessRequestRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  accessGrantedAt: string | null;
  reminderSentAt: string | null;
}

export async function createAccessRequest(input: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  comment?: string | null;
  source?: string;
}) {
  const profile = await upsertCustomerProfile({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
  });

  const { data: request, error } = await supabase
    .from("AccessRequest")
    .insert({
      customerProfileId: profile.id,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      email: input.email,
      phone: input.phone || null,
      comment: input.comment || null,
      source: input.source || "web",
    })
    .select("*")
    .single();

  if (error) throw error;

  const { subject, html } = buildAccessRequestEmail(input.firstName || "there");
  await sendEmail({ to: input.email, subject, html });

  const { error: logError } = await supabase.from("CustomerEventLog").insert({
    shopifyCustomerId: profile.shopifyCustomerId || "unknown",
    customerEmail: input.email,
    customerName: `${input.firstName || ""} ${input.lastName || ""}`.trim() || null,
    eventType: "access_request",
    emailSent: "access_request_received",
    metadata: { accessRequestId: request.id },
  });
  if (logError) throw logError;

  return request;
}

export async function markAccessProofSubmitted(email: string) {
  const { data: request, error: findError } = await supabase
    .from("AccessRequest")
    .select("*")
    .eq("email", email)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (!request) throw new Error("Access request not found");

  const { data, error } = await supabase
    .from("AccessRequest")
    .update({ proofSubmittedAt: new Date().toISOString() })
    .eq("id", request.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function grantAccessRequest(
  email: string,
  password = DEFAULT_MEMBERS_PASSWORD
) {
  const { data: request, error: findError } = await supabase
    .from("AccessRequest")
    .select("*")
    .eq("email", email)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (!request) throw new Error("Access request not found");

  const now = new Date();
  const { error: updateError } = await supabase
    .from("AccessRequest")
    .update({
      accessGrantedAt: now.toISOString(),
      passwordSentAt: now.toISOString(),
    })
    .eq("id", request.id);

  if (updateError) throw updateError;

  await upsertCustomerProfile({
    email,
    firstName: request.firstName,
    lastName: request.lastName,
    phone: request.phone,
    membersAccessGrantedAt: now,
  });

  const { subject, html } = buildAccessGrantedEmail(request.firstName || "there", password);
  await sendEmail({ to: email, subject, html });

  const { error: logError } = await supabase.from("CustomerEventLog").insert({
    shopifyCustomerId: "unknown",
    customerEmail: email,
    customerName: `${request.firstName || ""} ${request.lastName || ""}`.trim() || null,
    eventType: "access_granted",
    emailSent: "members_password",
    metadata: { accessRequestId: request.id },
  });

  if (logError) throw logError;
}

export async function processAccessRequestReminders(): Promise<void> {
  const { data: raw, error } = await supabase
    .from("AccessRequest")
    .select("id, firstName, lastName, email, phone, accessGrantedAt, reminderSentAt")
    .not("accessGrantedAt", "is", null)
    .is("reminderSentAt", null)
    .order("accessGrantedAt", { ascending: true });

  if (error) throw error;

  const requests = (raw || []) as AccessRequestRow[];
  const now = new Date();

  for (const request of requests) {
    if (!request.accessGrantedAt) continue;

    const grantedAt = new Date(request.accessGrantedAt);
    const daysSince = Math.floor(
      (now.getTime() - grantedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSince < 2) continue;

    const alreadyOrdered = await hasOrderSince(request.email, grantedAt);
    if (alreadyOrdered) {
      const { error: upErr } = await supabase
        .from("AccessRequest")
        .update({ reminderSentAt: now.toISOString() })
        .eq("id", request.id);
      if (upErr) throw upErr;
      continue;
    }

    const alreadySent = await hasAutomationDispatch({
      automationKey: "access_request",
      stageKey: "reminder",
      entityType: "access_request",
      entityId: request.id,
    });

    if (alreadySent) continue;

    const { subject, html } = buildMembersReminderEmail(request.firstName || "there");
    await sendEmail({ to: request.email, subject, html });

    const { error: upErr } = await supabase
      .from("AccessRequest")
      .update({ reminderSentAt: now.toISOString() })
      .eq("id", request.id);
    if (upErr) throw upErr;

    await recordAutomationDispatch({
      automationKey: "access_request",
      stageKey: "reminder",
      entityType: "access_request",
      entityId: request.id,
      customerEmail: request.email,
      customerName: request.firstName,
    });
  }

  logger.info("Access-request reminders processed", {
    requests: requests.length,
  });
}
