import { processReengagementCampaigns } from "@/lib/workflows/reengagement";
import { processPostPurchaseFollowups } from "@/lib/workflows/post-purchase";
import { processBirthdayCampaigns } from "@/lib/workflows/birthdays";
import { processVipRecognition } from "@/lib/workflows/vip-recognition";
import { processAccessRequestReminders } from "@/lib/workflows/access-requests";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

type Task = {
  name: string;
  run: () => Promise<unknown>;
};

const tasks: Task[] = [
  { name: "reengagement", run: processReengagementCampaigns },
  { name: "post-purchase", run: processPostPurchaseFollowups },
  { name: "birthdays", run: processBirthdayCampaigns },
  { name: "vip-recognition", run: processVipRecognition },
  { name: "access-request-reminders", run: processAccessRequestReminders },
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: Array<{ name: string; status: "ok" | "error"; error?: string }> = [];

  for (const task of tasks) {
    try {
      await task.run();
      results.push({ name: task.name, status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name: task.name, status: "error", error: message });
      logger.error("Daily cron task failed", { task: task.name, error: message });
    }
  }

  const errorCount = results.filter((r) => r.status === "error").length;
  logger.info("Daily cron complete", {
    total: results.length,
    errors: errorCount,
  });

  return Response.json({
    success: errorCount === 0,
    results,
  });
}
