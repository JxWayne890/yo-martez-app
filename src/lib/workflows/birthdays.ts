import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { buildBirthdayEmail } from "@/lib/email/automation-templates";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { findShopifyCustomerIdByEmail, upsertCustomerBirthdayMetafield } from "@/lib/shopify/orders";
import { upsertCustomerProfile } from "@/lib/customer-profiles";
import { logger } from "@/lib/logger";

interface BirthdayProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  birthday: string | null;
  shopifyCustomerId: string | null;
}

function normalizeDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getBirthdayOffsetThisYear(today: Date, birthday: Date): number {
  const currentYear = today.getFullYear();
  const thisYearBirthday = normalizeDate(
    new Date(currentYear, birthday.getMonth(), birthday.getDate())
  );
  return Math.round(
    (thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export async function saveCustomerBirthday(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  birthday: Date;
  source?: string;
}): Promise<void> {
  await upsertCustomerProfile({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    birthday: input.birthday,
    birthdaySource: input.source || "form",
  });

  const customerId = await findShopifyCustomerIdByEmail(input.email);
  if (customerId) {
    const iso = input.birthday.toISOString().slice(0, 10);
    await upsertCustomerBirthdayMetafield(customerId, iso);
  }
}

export async function processBirthdayCampaigns(): Promise<void> {
  const { data: raw, error } = await supabase
    .from("CustomerProfile")
    .select("email, firstName, lastName, birthday, shopifyCustomerId")
    .not("birthday", "is", null);

  if (error) throw error;

  const profiles = (raw || []) as BirthdayProfile[];
  const today = normalizeDate(new Date());

  for (const profile of profiles) {
    if (!profile.birthday) continue;

    const birthday = new Date(profile.birthday);
    const daysUntil = getBirthdayOffsetThisYear(today, birthday);
    const stage =
      daysUntil === 2 ? "pre" : daysUntil === 0 ? "day" : daysUntil === -2 ? "last_call" : null;

    if (!stage) continue;

    const stageKey = `${stage}_${today.getFullYear()}`;
    const alreadySent = await hasAutomationDispatch({
      automationKey: "birthday",
      stageKey,
      entityType: "customer",
      entityId: profile.email,
    });

    if (alreadySent) continue;

    const firstName = profile.firstName || "there";
    const { subject, html } = buildBirthdayEmail(stage, firstName);

    await sendEmail({ to: profile.email, subject, html });

    await recordAutomationDispatch({
      automationKey: "birthday",
      stageKey,
      entityType: "customer",
      entityId: profile.email,
      customerEmail: profile.email,
      customerName: firstName,
      metadata: { daysUntil },
    });

    const { error: logError } = await supabase.from("CustomerEventLog").insert({
      shopifyCustomerId: profile.shopifyCustomerId || "unknown",
      customerEmail: profile.email,
      customerName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || null,
      eventType: "birthday",
      emailSent: stageKey,
      metadata: { daysUntil },
    });
    if (logError) throw logError;
  }

  logger.info("Birthday automation processed", {
    profileCount: profiles.length,
  });
}
