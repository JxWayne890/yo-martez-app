import type { SlackEvent } from "@/types/slack";

export function extractMessageText(event: SlackEvent): string | null {
  if (!event.event) return null;

  // Skip bot messages to avoid loops
  if (event.event.bot_id || event.event.subtype === "bot_message") {
    return null;
  }

  return event.event.text || null;
}

export function extractChannelInfo(event: SlackEvent): {
  channel: string;
  ts: string;
  threadTs?: string;
} | null {
  if (!event.event) return null;

  return {
    channel: event.event.channel,
    ts: event.event.ts,
    threadTs: event.event.thread_ts,
  };
}
