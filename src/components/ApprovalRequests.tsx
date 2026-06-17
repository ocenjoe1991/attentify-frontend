import { useEffect, useState } from "react";
import axios from "axios";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useCompany } from "../context/CompanyContext";
import { useNotification } from "../context/NotificationContext";

interface DashboardApproval {
  _id: string;
  type: string;
  requester_name?: string;
  requester_email?: string;
  created_at?: string;
  payload?: Record<string, unknown>;
}

// Response shape from /approval-requests

const formatLocalDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const approvalLabel = (type: string) => {
  switch (type) {
    case "refund":
      return "Refund approval";
    case "cancellation":
      return "Cancellation approval";
    case "resolve":
      return "Resolve approval";
    default:
      return `${type || "Action"} approval`;
  }
};

export default function ApprovalRequests() {
  const { currentCompanyId } = useCompany();
  const { notify } = useNotification();
  const [approvals, setApprovals] = useState<DashboardApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<DashboardApproval | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchApprovals = async () => {
    if (!currentCompanyId) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || ""}/shopify/approval-requests?company_id=${currentCompanyId}&status_filter=pending`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const data = response.data;
      setApprovals(data.requests || []);
    } catch (error) {
      console.error("Failed to fetch approval requests", error);
      notify("error", "Failed to fetch approval requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [currentCompanyId]);

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setLoading(true);
    try {
      const resp = await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/shopify/approval-requests/${selectedApproval._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      notify("success", resp.data?.msg || "Approved");
      setIsModalOpen(false);
      setSelectedApproval(null);
      await fetchApprovals();
    } catch (err: any) {
      console.error("Approve failed", err);
      notify("error", err?.response?.data?.detail || "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    if (!rejectionReason || !rejectionReason.trim()) {
      notify("error", "Please provide a rejection reason.");
      return;
    }
    setLoading(true);
    try {
      const resp = await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/shopify/approval-requests/${selectedApproval._id}/reject`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      notify("success", resp.data?.msg || "Rejected");
      setIsModalOpen(false);
      setSelectedApproval(null);
      setRejectionReason("");
      await fetchApprovals();
    } catch (err: any) {
      console.error("Reject failed", err);
      notify("error", err?.response?.data?.detail || "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Team Pending Approvals</h2>
          <p className="mt-1 text-sm text-gray-500">Manage all pending approval requests from your team.</p>
        </div>
        <button
          type="button"
          onClick={fetchApprovals}
          disabled={loading}
          className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          No pending approvals to review.
        </div>
      ) : (
        <div className="space-y-3">
            {approvals.map((approval) => (
            <button
              key={approval._id}
              type="button"
              onClick={() => {
                setSelectedApproval(approval);
                setRejectionReason("");
                setIsModalOpen(true);
              }}
              className="w-full border border-gray-200 px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{approvalLabel(approval.type)}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {approval.requester_name && <>{approval.requester_name}</>}
                    {approval.requester_name && approval.requester_email && <> ({approval.requester_email})</>}
                    {!approval.requester_name && approval.requester_email && <>{approval.requester_email}</>}
                    {!approval.requester_name && !approval.requester_email && <>Unknown</>}
                  </div>
                </div>
                <div className="text-xs text-gray-500">{formatLocalDate(approval.created_at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Approval Details Modal */}
      {isModalOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md border border-gray-300 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Approval Request</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedApproval(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <div>
                <span className="text-xs font-semibold text-gray-600">TYPE</span>
                <p className="mt-1 text-sm font-medium text-gray-900">{approvalLabel(selectedApproval.type)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">REQUESTER</span>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedApproval.requester_name && <>{selectedApproval.requester_name}</>}
                  {selectedApproval.requester_name && selectedApproval.requester_email && <> ({selectedApproval.requester_email})</>}
                  {!selectedApproval.requester_name && selectedApproval.requester_email && <>{selectedApproval.requester_email}</>}
                  {!selectedApproval.requester_name && !selectedApproval.requester_email && <>Unknown</>}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">REQUESTED AT</span>
                <p className="mt-1 text-sm text-gray-900">{formatLocalDate(selectedApproval.created_at)}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600">Rejection reason (required to reject)</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Explain why this request is rejected"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleApprove()}
                className="flex-1 border border-green-600 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleReject()}
                className="flex-1 border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
