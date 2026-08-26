export type SyncLogChannel = "gmail" | "shopify" | "ticket";

export const syncDebugLog = (
  channel: SyncLogChannel,
  event: string,
  payload?: Record<string, unknown> | unknown[] | string | number | boolean | null
) => {
  const timestamp = new Date().toISOString();
  const prefix = `[Attentify Sync][${channel.toUpperCase()}][${timestamp}] ${event}`;

  if (payload === undefined) {
    console.info(prefix);
    return;
  }

  console.info(prefix, payload);
};
