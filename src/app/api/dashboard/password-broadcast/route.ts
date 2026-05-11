import {
  getPasswordBroadcastRecipients,
  processPasswordBroadcast,
} from "@/lib/workflows/password-broadcast";

export const maxDuration = 300;

export async function GET() {
  const recipients = await getPasswordBroadcastRecipients();

  return Response.json({
    recipientCount: recipients.length,
    sampleRecipients: recipients.slice(0, 5).map((recipient) => ({
      email: recipient.email,
      firstName: recipient.firstName,
    })),
  });
}

export async function POST(request: Request) {
  let password: string;
  let confirmed: boolean;

  try {
    const body = await request.json();
    password = typeof body.password === "string" ? body.password.trim() : "";
    confirmed = body.confirmed === true;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!password) {
    return Response.json({ error: "password is required" }, { status: 400 });
  }

  if (!confirmed) {
    return Response.json(
      { error: "confirmed must be true before broadcasting a password" },
      { status: 400 }
    );
  }

  const result = await processPasswordBroadcast({ password });

  return Response.json({
    success: result.failedCount === 0,
    ...result,
  });
}
