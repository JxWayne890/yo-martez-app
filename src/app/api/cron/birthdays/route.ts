import { processBirthdayCampaigns } from "@/lib/workflows/birthdays";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await processBirthdayCampaigns();
    return Response.json({ success: true });
  } catch (error) {
    logger.error("Birthdays cron failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
