import { verifySlackSignature } from "@/lib/slack/verify";
import { extractMessageText, extractChannelInfo } from "@/lib/slack/parse-message";
import { processSlackDraftOrder } from "@/lib/workflows/slack-draft-order";
import { processPasswordBroadcast } from "@/lib/workflows/password-broadcast";
import { logger } from "@/lib/logger";
import type { SlackEvent } from "@/types/slack";

function extractPasswordBroadcast(text: string): string | null {
  const match = text.match(/password\s+is\s+(.+)/i);
  return match?.[1]?.trim() || null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("X-Slack-Request-Timestamp") || "";
  const signature = request.headers.get("X-Slack-Signature") || "";

  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
    logger.warn("Invalid Slack signature");
    return new Response("Unauthorized", { status: 401 });
  }

  const event: SlackEvent = JSON.parse(rawBody);

  if (event.type === "url_verification") {
    return Response.json({ challenge: event.challenge });
  }

  const messageText = extractMessageText(event);
  if (!messageText) {
    return new Response("OK", { status: 200 });
  }

  const channelInfo = extractChannelInfo(event);
  if (!channelInfo) {
    return new Response("OK", { status: 200 });
  }

  const expectedChannel = process.env.SLACK_CHANNEL_ID;
  if (expectedChannel && channelInfo.channel !== expectedChannel) {
    logger.info("Slack event from non-matching channel, ignoring", {
      channel: channelInfo.channel,
    });
    return new Response("OK", { status: 200 });
  }

  const lowerText = messageText.toLowerCase();
  const password = extractPasswordBroadcast(messageText);

  try {
    if (password) {
      await processPasswordBroadcast({
        password,
        slackChannel: channelInfo.channel,
        slackTs: channelInfo.ts,
      });
      return new Response("OK", { status: 200 });
    }

    if (!lowerText.includes("draft")) {
      return new Response("OK", { status: 200 });
    }

    await processSlackDraftOrder({
      messageText,
      slackChannel: channelInfo.channel,
      slackTs: channelInfo.ts,
    });
  } catch (error) {
    logger.error("Slack event processing failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response("Processing failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
