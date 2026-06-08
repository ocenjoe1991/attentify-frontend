import { useEffect, useState } from "react";
import axios from "axios";
import { useCompany } from "../context/CompanyContext";
import { useNotification } from "../context/NotificationContext";

interface AuditLog {
  _id: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  ticket?: string;
  customer?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

const roleLabel = (role?: string) => {
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

const formatUtcDate = (value: string) => {
  const date = new Date(value);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
};

const detailValue = (details: Record<string, unknown> | undefined, key: string) => {
  const value = details?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const buildLogText = (log: AuditLog) => {
  const parts = [
    `${formatUtcDate(log.created_at)} - User: ${log.actor_name || "Unknown user"} (${roleLabel(log.actor_role)})`,
    `Action: ${log.action}`,
  ];

  if (log.ticket) parts.push(`Ticket: #${log.ticket}`);
  if (log.customer) parts.push(`Customer: ${log.customer}`);

  const target = detailValue(log.details, "target_email");
  const orderId = detailValue(log.details, "order_id");
  const shop = detailValue(log.details, "shop");
  const email = detailValue(log.details, "email");
  const phoneNumber = detailValue(log.details, "phone_number");

  if (target) parts.push(`Target: ${target}`);
  if (orderId) parts.push(`Order: ${orderId}`);
  if (shop) parts.push(`Shop: ${shop}`);
  if (email) parts.push(`Email: ${email}`);
  if (phoneNumber) parts.push(`Phone: ${phoneNumber}`);

  return parts.join(" - ");
};

export default function AuditLogSection() {
  const { currentCompanyId } = useCompany();
  const { notify } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    if (!currentCompanyId) return;

    const fetchAuditLogs = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || ""}/company/${currentCompanyId}/audit-logs`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          }
        );
        setLogs(response.data?.logs || []);
      } catch (error) {
        console.error("Failed to load audit logs:", error);
        notify("error", "Failed to load audit logs");
      }
    };

    fetchAuditLogs();
  }, [currentCompanyId, notify]);

  return (
    <section>
      <h3 className="text-xl font-semibold text-gray-800">Audit Log</h3>
      <div className="mt-4 border border-gray-300 divide-y divide-gray-200">
        {logs.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No audit log entries yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log._id} className="p-4 text-sm text-gray-700">
              {buildLogText(log)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
