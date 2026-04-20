import { processReengagementCampaigns } from "@/lib/workflows/reengagement";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await processReengagementCampaigns();
    return Response.json({ success: true });
  } catch (error) {
    logger.error("Reengagement cron failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
