export interface AuditLog {
  _id: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  ticket?: string;
  customer?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export const roleLabel = (role?: string) => {
  switch (role) {
    case "company_owner":
      return "Owner";
    case "store_owner":
      return "Store Owner";
    case "agent":
      return "Agent";
    case "readonly":
      return "Read-only";
    case "admin":
      return "Admin";
    default:
      return role || "Unknown";
  }
};

export const formatLocalDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const detailValue = (details: Record<string, unknown> | undefined, key: string) => {
  const value = details?.[key];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
};

export const buildLogText = (log: AuditLog, options: { includeDate?: boolean } = {}) => {
  const includeDate = options.includeDate ?? true;
  const parts = [
    `User: ${log.actor_name || "Unknown user"} (${roleLabel(log.actor_role)})`,
    `Action: ${log.action}`,
  ];

  if (includeDate) {
    parts.unshift(formatLocalDate(log.created_at));
  }

  if (log.ticket) parts.push(`Ticket: #${log.ticket}`);
  if (log.customer) parts.push(`Customer: ${log.customer}`);

  const target = detailValue(log.details, "target_email");
  const orderId = detailValue(log.details, "order_id");
  const shop = detailValue(log.details, "shop");
  const email = detailValue(log.details, "email");
  const gmailId = detailValue(log.details, "gmail_id");
  const historyId = detailValue(log.details, "history_id");
  const syncMode = detailValue(log.details, "sync_mode");
  const orderSyncTriggered = detailValue(log.details, "order_sync_triggered");
  const processedMessages = detailValue(log.details, "processed_messages");
  const skippedMessages = detailValue(log.details, "skipped_messages");
  const runtime = detailValue(log.details, "runtime");
  const phoneNumber = detailValue(log.details, "phone_number");
  const source = detailValue(log.details, "source");
  const connectedStores = detailValue(log.details, "connected_stores");
  const syncedShops = detailValue(log.details, "synced_shops");
  const syncedOrders = detailValue(log.details, "synced_orders");
  const storedMessages = detailValue(log.details, "stored_messages");
  const updatedMessages = detailValue(log.details, "updated_messages");
  const failedAccounts = detailValue(log.details, "failed_accounts");
  const errors = detailValue(log.details, "errors");
  const deletedCount = detailValue(log.details, "deleted_count");

  if (target) parts.push(`Target: ${target}`);
  if (orderId) parts.push(`Order: ${orderId}`);
  if (shop) parts.push(`Shop: ${shop}`);
  if (email) parts.push(`Email: ${email}`);
  if (gmailId) parts.push(`Gmail ID: ${gmailId}`);
  if (historyId) parts.push(`History ID: ${historyId}`);
  if (syncMode) parts.push(`Mode: ${syncMode}`);
  if (orderSyncTriggered) parts.push(`Order sync triggered: ${orderSyncTriggered}`);
  if (phoneNumber) parts.push(`Phone: ${phoneNumber}`);
  if (source) parts.push(`Source: ${source}`);
  if (connectedStores) parts.push(`Connected stores: ${connectedStores}`);
  if (syncedShops) parts.push(`Synced shops: ${syncedShops}`);
  if (syncedOrders) parts.push(`Synced orders: ${syncedOrders}`);
  if (storedMessages) parts.push(`Stored messages: ${storedMessages}`);
  if (updatedMessages) parts.push(`Updated messages: ${updatedMessages}`);
  if (processedMessages) parts.push(`Processed messages: ${processedMessages}`);
  if (skippedMessages) parts.push(`Skipped messages: ${skippedMessages}`);
  if (failedAccounts) parts.push(`Failed accounts: ${failedAccounts}`);
  if (errors) parts.push(`Errors: ${errors}`);
  if (deletedCount) parts.push(`Deleted: ${deletedCount}`);
  if (runtime) parts.push(`Runtime: ${runtime}`);

  return parts.join(" - ");
};
