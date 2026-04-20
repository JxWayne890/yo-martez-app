export interface SlackEvent {
  type: string;
  challenge?: string;
  token?: string;
  event?: {
    type: string;
    subtype?: string;
    text: string;
    user: string;
    channel: string;
    ts: string;
    thread_ts?: string;
    bot_id?: string;
  };
  team_id?: string;
}
