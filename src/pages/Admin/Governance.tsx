import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  BellAlertIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Layout from "../../layouts/AdminLayout";
import { useNotification } from "../../context/NotificationContext";
import { usePageTitle } from "../../context/PageTitleContext";

type RoleKey = "company_owner" | "store_owner" | "agent" | "readonly";
type PermissionKey =
  | "manage_members"
  | "manage_stores"
  | "manage_tickets"
  | "process_refunds"
  | "process_cancellations"
  | "view_reports";

type ApprovalSettings = {
  ticket_resolution_requires_owner: boolean;
  refund_requires_owner: boolean;
  cancellation_requires_owner: boolean;
  high_value_refund_requires_owner: boolean;
  high_value_refund_threshold: number;
};

type NotificationSettings = {
  admin_new_user: boolean;
  admin_store_added: boolean;
  owner_approval_requested: boolean;
  escalated_ticket: boolean;
  assigned_ticket: boolean;
  unresolved_reply: boolean;
  comment_mentions: boolean;
  email_digest: boolean;
};

type GovernanceSettings = {
  permissions: Record<RoleKey, Record<PermissionKey, boolean>>;
  approvals: ApprovalSettings;
  notifications: NotificationSettings;
  updated_at?: string | null;
  updated_by?: string | null;
};

type AdminNotification = {
  _id: string;
  title: string;
  message: string;
  actor_email?: string;
  created_at?: string;
  read: boolean;
};

const API_URL = import.meta.env.VITE_API_URL || "";

const roles: { key: RoleKey; label: string; detail: string }[] = [
  { key: "company_owner", label: "Company Owner", detail: "Workspace-wide control" },
  { key: "store_owner", label: "Store Owner", detail: "Store-scoped operations" },
  { key: "agent", label: "Agent", detail: "Assigned ticket handling" },
  { key: "readonly", label: "Read-only", detail: "View-only access" },
];

const permissionColumns: { key: PermissionKey; label: string }[] = [
  { key: "manage_members", label: "Members" },
  { key: "manage_stores", label: "Stores" },
  { key: "manage_tickets", label: "Tickets" },
  { key: "process_refunds", label: "Refunds" },
  { key: "process_cancellations", label: "Cancellations" },
  { key: "view_reports", label: "Reports" },
];

const approvalRows: { key: keyof ApprovalSettings; label: string; description: string }[] = [
  {
    key: "ticket_resolution_requires_owner",
    label: "Ticket resolution",
    description: "Require owner approval before resolution notes are finalized.",
  },
  {
    key: "refund_requires_owner",
    label: "Refunds",
    description: "Route refund actions through owner approval.",
  },
  {
    key: "cancellation_requires_owner",
    label: "Cancellations",
    description: "Route cancellation actions through owner approval.",
  },
  {
    key: "high_value_refund_requires_owner",
    label: "High-value refunds",
    description: "Require approval when a refund passes the configured threshold.",
  },
];

const notificationRows: { key: keyof NotificationSettings; label: string; description: string }[] = [
  {
    key: "admin_new_user",
    label: "New user account",
    description: "Notify admins when a user account is created.",
  },
  {
    key: "admin_store_added",
    label: "Store added",
    description: "Notify admins when a Shopify store is connected.",
  },
  {
    key: "owner_approval_requested",
    label: "Approval requested",
    description: "Notify owners when a ticket needs approval.",
  },
  {
    key: "escalated_ticket",
    label: "Escalated tickets",
    description: "Notify owners when tickets are escalated.",
  },
  {
    key: "assigned_ticket",
    label: "Assigned tickets",
    description: "Notify agents when tickets are assigned.",
  },
  {
    key: "unresolved_reply",
    label: "Unresolved replies",
    description: "Group replies on open tickets into notification updates.",
  },
  {
    key: "comment_mentions",
    label: "Comment mentions",
    description: "Notify users when they are mentioned in a ticket comment.",
  },
  {
    key: "email_digest",
    label: "Email digest",
    description: "Send grouped summaries by email.",
  },
];

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
      checked ? "bg-blue-600" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
        checked ? "translate-x-5" : "translate-x-1"
      }`}
    />
  </button>
);

export default function Governance() {
  const [settings, setSettings] = useState<GovernanceSettings | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notify } = useNotification();
  const { setTitle } = usePageTitle();

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` }),
    []
  );

  useEffect(() => {
    setTitle("Governance");
  }, [setTitle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, notificationsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/governance`, { headers }),
        axios.get(`${API_URL}/admin/notifications`, { headers }),
      ]);
      setSettings(settingsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error(error);
      notify("error", "Failed to load governance settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updatePermission = (role: RoleKey, permission: PermissionKey) => {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        permissions: {
          ...current.permissions,
          [role]: {
            ...current.permissions[role],
            [permission]: !current.permissions[role][permission],
          },
        },
      };
    });
  };

  const updateApproval = (key: keyof ApprovalSettings, value?: number) => {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        approvals: {
          ...current.approvals,
          [key]:
            typeof value === "number"
              ? value
              : !Boolean(current.approvals[key]),
        },
      };
    });
  };

  const updateNotification = (key: keyof NotificationSettings) => {
    setSettings((current) => {
      if (!current) return current;
      return {
        ...current,
        notifications: {
          ...current.notifications,
          [key]: !current.notifications[key],
        },
      };
    });
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await axios.put(`${API_URL}/admin/governance`, settings, {
        headers,
      });
      setSettings(response.data);
      notify("success", "Governance settings saved.");
      await loadData();
    } catch (error) {
      console.error(error);
      notify("error", "Failed to save governance settings.");
    } finally {
      setSaving(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await axios.post(`${API_URL}/admin/notifications/${id}/read`, {}, { headers });
      setNotifications((items) =>
        items.map((item) => (item._id === id ? { ...item, read: true } : item))
      );
    } catch (error) {
      console.error(error);
      notify("error", "Failed to update notification.");
    }
  };

  if (loading || !settings) {
    return (
      <Layout>
        <div className="p-4 text-gray-500">Loading governance settings...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-5">
        <div className="flex flex-col gap-3 border border-gray-300 bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Admin governance</h1>
            <p className="mt-1 text-sm text-gray-500">
              Control operational permissions, owner approvals, and notification routing.
            </p>
          </div>
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 md:w-auto"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="border border-gray-300 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Role permissions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                    {permissionColumns.map((permission) => (
                      <th key={permission.key} className="px-3 py-3 text-center font-semibold text-gray-600">
                        {permission.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.key} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{role.label}</div>
                        <div className="text-xs text-gray-500">{role.detail}</div>
                      </td>
                      {permissionColumns.map((permission) => (
                        <td key={permission.key} className="px-3 py-3 text-center">
                          <Toggle
                            checked={settings.permissions[role.key][permission.key]}
                            onChange={() => updatePermission(role.key, permission.key)}
                            label={`${role.label} ${permission.label}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-gray-300 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <BellAlertIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Admin notifications</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No admin notifications yet.</div>
              ) : (
                notifications.map((item) => (
                  <div key={item._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{item.title}</div>
                        <div className="mt-1 text-sm text-gray-500">{item.message}</div>
                        <div className="mt-2 text-xs text-gray-400">
                          {item.actor_email || "System"} -{" "}
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                        </div>
                      </div>
                      {!item.read && (
                        <button
                          type="button"
                          onClick={() => markRead(item._id)}
                          className="shrink-0 border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="border border-gray-300 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <CheckCircleIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Approval rules</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {approvalRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{row.label}</div>
                    <div className="text-sm text-gray-500">{row.description}</div>
                  </div>
                  <Toggle
                    checked={Boolean(settings.approvals[row.key])}
                    onChange={() => updateApproval(row.key)}
                    label={row.label}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 p-4">
                <div>
                  <div className="text-sm font-medium text-gray-800">High-value threshold</div>
                  <div className="text-sm text-gray-500">Refund amount that triggers extra review.</div>
                </div>
                <input
                  type="number"
                  min={0}
                  value={settings.approvals.high_value_refund_threshold}
                  onChange={(event) =>
                    updateApproval("high_value_refund_threshold", Number(event.target.value))
                  }
                  className="w-28 border border-gray-300 px-3 py-2 text-right text-sm"
                />
              </div>
            </div>
          </section>

          <section className="border border-gray-300 bg-white">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
              <BellAlertIcon className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-gray-800">Notification routing</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {notificationRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{row.label}</div>
                    <div className="text-sm text-gray-500">{row.description}</div>
                  </div>
                  <Toggle
                    checked={settings.notifications[row.key]}
                    onChange={() => updateNotification(row.key)}
                    label={row.label}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
