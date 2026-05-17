import { getUpcomingEmails } from "@/lib/dashboard/upcoming-emails";
import { logger } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({
      items: [],
      count: 0,
      generatedAt: new Date().toISOString(),
      notes: [
        "Supabase is not configured in this environment, so the upcoming email queue cannot be calculated.",
      ],
    });
  }

  try {
    return Response.json(await getUpcomingEmails(limit));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Upcoming email queue failed", { error: message });
    return Response.json(
      { error: "Failed to load upcoming email queue", detail: message },
      { status: 500 }
    );
  }
}
