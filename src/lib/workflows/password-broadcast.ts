import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/email/sendgrid";
import { buildPasswordBroadcastEmail } from "@/lib/email/automation-templates";
import { hasAutomationDispatch, recordAutomationDispatch } from "@/lib/automation-dispatches";
import { logger } from "@/lib/logger";

export async function processPasswordBroadcast(
  payload: Record<string, unknown>
): Promise<void> {
  const password = String(payload.password || "").trim();
  if (!password) {
    throw new Error("Password broadcast requested without a password");
  }

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
    recipients.set(profile.email, profile.firstName || "there");
  }

  for (const request of granted || []) {
    if (!recipients.has(request.email)) {
      recipients.set(request.email, request.firstName || "there");
    }
  }

  for (const [email, firstName] of recipients.entries()) {
    const alreadySent = await hasAutomationDispatch({
      automationKey: "password_broadcast",
      stageKey: password,
      entityType: "customer",
      entityId: email,
    });

    if (alreadySent) continue;

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
  }

  logger.info("Password broadcast completed", {
    recipientCount: recipients.size,
  });
}
