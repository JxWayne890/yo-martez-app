import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { incrementUsage } from "@/lib/usage";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL!;
  const fromName = process.env.RESEND_FROM_NAME || "Yo! Martez";
  const resend = new Resend(process.env.RESEND_API_KEY!);

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      throw new Error(error.message);
    }

    await incrementUsage("emails_sent");
    logger.info("Email sent", { to: options.to, subject: options.subject });
  } catch (error) {
    logger.error("Failed to send email", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
