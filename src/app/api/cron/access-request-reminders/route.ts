import { processAccessRequestReminders } from "@/lib/workflows/access-requests";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await processAccessRequestReminders();
    return Response.json({ success: true });
  } catch (error) {
    logger.error("Access request reminders cron failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
