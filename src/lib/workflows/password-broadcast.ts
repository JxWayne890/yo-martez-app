import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { buildPasswordBroadcastEmail } from "@/lib/email/automation-templates";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { logger } from "@/lib/logger";

export interface PasswordBroadcastRecipient {
  email: string;
  firstName: string;
}

export interface PasswordBroadcastResult {
  totalRecipients: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  failures: { email: string; error: string }[];
}

export async function getPasswordBroadcastRecipients(): Promise<PasswordBroadcastRecipient[]> {
  const [{ data: profiles, error: pErr }, { data: granted, error: gErr }] = await Promise.all([
    supabase.from("CustomerProfile").select("email, firstName"),
    supabase
      .from("AccessRequest")
      .select("email, firstName")
      .not("accessGrantedAt", "is", null),
  ]);

  if (pErr) throw pErr;
  if (gErr) throw gErr;

  const recipients = new Map<string, string>();

  for (const profile of profiles || []) {
    if (!profile.email) continue;
    recipients.set(profile.email, profile.firstName || "there");
  }

  for (const request of granted || []) {
    if (!request.email || recipients.has(request.email)) continue;
    recipients.set(request.email, request.firstName || "there");
  }

  return Array.from(recipients.entries()).map(([email, firstName]) => ({
    email,
    firstName,
  }));
}

export async function processPasswordBroadcast(
  payload: Record<string, unknown>
): Promise<PasswordBroadcastResult> {
  const password = String(payload.password || "").trim();
  if (!password) {
    throw new Error("Password broadcast requested without a password");
  }

  const recipients = await getPasswordBroadcastRecipients();
  const failures: PasswordBroadcastResult["failures"] = [];
  let sentCount = 0;
  let skippedCount = 0;

  for (const { email, firstName } of recipients) {
    const alreadySent = await hasAutomationDispatch({
      automationKey: "password_broadcast",
      stageKey: password,
      entityType: "customer",
      entityId: email,
    });

    if (alreadySent) {
      skippedCount += 1;
      continue;
    }

    try {
      const { subject, html } = buildPasswordBroadcastEmail(firstName, password);
      await sendEmail({ to: email, subject, html });

      await recordAutomationDispatch({
        automationKey: "password_broadcast",
        stageKey: password,
        entityType: "customer",
        entityId: email,
        customerEmail: email,
        customerName: firstName,
      });

      sentCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ email, error: message });
      logger.error("Password broadcast recipient failed", { email, error: message });
    }
  }

  logger.info("Password broadcast completed", {
    recipientCount: recipients.length,
    sentCount,
    skippedCount,
    failedCount: failures.length,
  });

  return {
    totalRecipients: recipients.length,
    sentCount,
    skippedCount,
    failedCount: failures.length,
    failures,
  };
}
