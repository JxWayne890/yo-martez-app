import { processVipRecognition } from "@/lib/workflows/vip-recognition";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await processVipRecognition();
    return Response.json({ success: true });
  } catch (error) {
    const detail =
      error && typeof error === "object"
        ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
        : String(error);
    logger.error("VIP recognition cron failed", { error: detail });
    return Response.json({ error: "Processing failed", detail }, { status: 500 });
  }
}
