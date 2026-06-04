import { useState, useEffect } from "react";
import { PencilIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { useCompany } from "../context/CompanyContext";
import { useNotification } from "../context/NotificationContext";
import { useUser } from "../context/UserContext";
import RoleWrapper from "../components/RoleWrapper"; 

const roleOptions = [
  { key: "company_owner", label: "Company Owner" },
  { key: "store_owner", label: "Store Owner" },
  { key: "agent", label: "Agent" },
  { key: "readonly", label: "Readonly" },
];

const defaultPermanentDeleteRoles = ["company_owner", "store_owner"];
const ownerRoles = ["company_owner", "store_owner"];

export default function GeneralSettings() {
  const { currentCompanyId } = useCompany();
  const { notify } = useNotification();
  const { user } = useUser();

  // Initial states - you can replace with real fetched data or empty strings
  const [companyName, setCompanyName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [email, setEmail] = useState("");

  // Draft states and edit mode states for each field
  const [companyNameDraft, setCompanyNameDraft] = useState(companyName);
  const [companyNameEdit, setCompanyNameEdit] = useState(false);

  const [siteUrlDraft, setSiteUrlDraft] = useState(siteUrl);
  const [siteUrlEdit, setSiteUrlEdit] = useState(false);

  const [emailDraft, setEmailDraft] = useState(email);
  const [emailEdit, setEmailEdit] = useState(false);
  const [permanentDeleteRoles, setPermanentDeleteRoles] = useState<string[]>(defaultPermanentDeleteRoles);
  const [permanentDeleteRolesDraft, setPermanentDeleteRolesDraft] = useState<string[]>(defaultPermanentDeleteRoles);
  const [deletePolicySaving, setDeletePolicySaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) return;

    const fetchSettings = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || ""}/company/${currentCompanyId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = response.data;
        if (data) {
          setCompanyName(data.name || "");
          setCompanyNameDraft(data.name || "");

          setSiteUrl(data.site_url || "");
          setSiteUrlDraft(data.site_url || "");

          setEmail(data.email || "");
          setEmailDraft(data.email || "");

          const deleteRoles = data.message_permanent_delete_roles || defaultPermanentDeleteRoles;
          setPermanentDeleteRoles(deleteRoles);
          setPermanentDeleteRolesDraft(deleteRoles);
        }
      } catch (error) {
        console.error("Error fetching company settings:", error);
        notify("error", "Error fetching company settings");
      }
    };

    fetchSettings();
  }, [currentCompanyId]);

  // Save function with unified update-company API call
  const saveField = async (field: string) => {
    try {
      let payload: Record<string, string> = { company_id: currentCompanyId };

      switch (field) {
        case "companyName":
          payload.name = companyNameDraft.trim();
          break;
        case "siteUrl":
          payload.site_url = siteUrlDraft.trim();
          break;
        case "email":
          payload.email = emailDraft.trim();
          break;
        default:
          console.error(`Unknown field: ${field}`);
          return;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || ""}/company/update-company`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      // Update state locally
      if (field === "companyName") {
        setCompanyName(companyNameDraft.trim());
        setCompanyNameEdit(false);
      } else if (field === "siteUrl") {
        setSiteUrl(siteUrlDraft.trim());
        setSiteUrlEdit(false);
      } else if (field === "email") {
        setEmail(emailDraft.trim());
        setEmailEdit(false);
      }

      notify("success", `${field === "companyName" ? "Name" : field === "siteUrl" ? "Site URL" : "Email"} updated successfully.`);
    } catch (error) {
      console.error(`Failed to save ${field}:`, error);
      notify("error", `Failed to save ${field}. Please try again.`);
    }
  };

  const togglePermanentDeleteRole = (role: string) => {
    setPermanentDeleteRolesDraft((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  };

  const saveDeletePolicy = async () => {
    setDeletePolicySaving(true);
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL || ""}/company/${currentCompanyId}/message-delete-policy`,
        { message_permanent_delete_roles: permanentDeleteRolesDraft },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      const deleteRoles = response.data.message_permanent_delete_roles || defaultPermanentDeleteRoles;
      setPermanentDeleteRoles(deleteRoles);
      setPermanentDeleteRolesDraft(deleteRoles);
      notify("success", "Permanent delete permissions updated.");
    } catch (error: any) {
      console.error("Failed to save delete policy:", error);
      notify("error", error?.response?.data?.detail || "Failed to save delete permissions.");
    } finally {
      setDeletePolicySaving(false);
    }
  };

  // Cancel edit handlers
  const cancelEdit = (field: string) => {
    switch (field) {
      case "companyName":
        setCompanyNameDraft(companyName);
        setCompanyNameEdit(false);
        break;
      case "siteUrl":
        setSiteUrlDraft(siteUrl);
        setSiteUrlEdit(false);
        break;
      case "email":
        setEmailDraft(email);
        setEmailEdit(false);
        break;
    }
  };

  // Reusable buttons and icon components
  const EditButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center text-indigo-600 hover:text-indigo-800 focus:outline-none text-sm font-medium"
      aria-label="Edit"
      type="button"
    >
      <PencilIcon className="w-4 h-4 mr-1" />
      Edit
    </button>
  );

  const SaveCancelButtons = ({
    onSave,
    onCancel,
    disableSave,
  }: {
    onSave: () => void;
    onCancel: () => void;
    disableSave?: boolean;
  }) => (
    <div className="flex gap-2">
      <button
        onClick={onSave}
        disabled={disableSave}
        className={`flex items-center text-white text-sm font-medium px-3 py-1 ${
          disableSave
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700"
        } focus:outline-none`}
        type="button"
      >
        <CheckIcon className="w-4 h-4 mr-1" />
        Save Changes
      </button>
      <button
        onClick={onCancel}
        className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm font-medium focus:outline-none"
        type="button"
      >
        <XMarkIcon className="w-4 h-4 mr-1" />
        Cancel
      </button>
    </div>
  );

  return (
    <section>
      <h3 className="text-xl font-semibold text-gray-700 mb-6">General</h3>

      {/* Company Name */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4 relative">
        <label
          htmlFor="company-name"
          className="text-lg font-medium text-gray-700 min-w-[100px]"
        >
          Name
        </label>
        <div className="flex-1 w-full max-w-xl">
          <input
            id="company-name"
            type="text"
            className={`border border-gray-300 px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              !companyNameEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            value={companyNameEdit ? companyNameDraft : companyName}
            onChange={(e) => setCompanyNameDraft(e.target.value)}
            disabled={!companyNameEdit}
            placeholder="Enter company name"
          />
          <RoleWrapper allowedRoles={["company_owner"]} userRole={user?.role || "agent"}>
            <div className="flex justify-end mt-1">
              {!companyNameEdit ? (
                <EditButton onClick={() => setCompanyNameEdit(true)} />
              ) : (
                <SaveCancelButtons
                  onSave={() => saveField("companyName")}
                  onCancel={() => cancelEdit("companyName")}
                  disableSave={!companyNameDraft.trim()}
                />
              )}
            </div>
          </RoleWrapper>
        </div>
      </div>

      {/* Site URL */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4 relative">
        <label
          htmlFor="site-url"
          className="text-lg font-medium text-gray-700 min-w-[100px]"
        >
          Site URL
        </label>
        <div className="flex-1 w-full max-w-xl">
          <input
            id="site-url"
            type="url"
            className={`border border-gray-300 px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              !siteUrlEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            value={siteUrlEdit ? siteUrlDraft : siteUrl}
            onChange={(e) => setSiteUrlDraft(e.target.value)}
            disabled={!siteUrlEdit}
            placeholder="Enter site URL"
          />
          <RoleWrapper allowedRoles={["company_owner"]} userRole={user?.role || "agent"}>
            <div className="flex justify-end mt-1">
              {!siteUrlEdit ? (
                <EditButton onClick={() => setSiteUrlEdit(true)} />
              ) : (
                <SaveCancelButtons
                  onSave={() => saveField("siteUrl")}
                  onCancel={() => cancelEdit("siteUrl")}
                  disableSave={!siteUrlDraft.trim()}
                />
              )}
            </div>
          </RoleWrapper>
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col sm:flex-row justify-between items-start mb-10 gap-4 relative">
        <label
          htmlFor="email"
          className="text-lg font-medium text-gray-700 min-w-[100px]"
        >
          Email
          <p className="mt-1 text-xs font-normal text-gray-500 max-w-[250px]">
            Email address for workspace updates, such as system notifications.
          </p>
        </label>
        <div className="flex-1 w-full max-w-xl">
          <input
            id="email"
            type="email"
            className={`border border-gray-300 px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              !emailEdit ? "bg-gray-100 cursor-not-allowed" : ""
            }`}
            value={emailEdit ? emailDraft : email}
            onChange={(e) => setEmailDraft(e.target.value)}
            disabled={!emailEdit}
            placeholder="Enter email"
          />

          <RoleWrapper allowedRoles={["company_owner"]} userRole={user?.role || "agent"}>
            <div className="flex justify-end mt-1">
              {!emailEdit ? (
                <EditButton onClick={() => setEmailEdit(true)} />
              ) : (
                <SaveCancelButtons
                  onSave={() => saveField("email")}
                  onCancel={() => cancelEdit("email")}
                  disableSave={!emailDraft.trim()}
                />
              )}
            </div>
          </RoleWrapper>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative">
        <label className="text-lg font-medium text-gray-700 min-w-[100px]">
          Message Delete
          <p className="mt-1 text-xs font-normal text-gray-500 max-w-[250px]">
            Roles allowed to permanently delete messages from trash.
          </p>
        </label>
        <div className="flex-1 w-full max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleOptions.map((role) => (
              <label
                key={role.key}
                className={`flex items-center gap-3 border border-gray-300 px-4 py-3 ${
                  user?.role !== "company_owner" ? "bg-gray-100" : "bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={permanentDeleteRolesDraft.includes(role.key)}
                  onChange={() => togglePermanentDeleteRole(role.key)}
                  disabled={user?.role !== "company_owner" || deletePolicySaving}
                  className="h-4 w-4 text-indigo-600 border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">{role.label}</span>
              </label>
            ))}
          </div>
          <RoleWrapper allowedRoles={["company_owner"]} userRole={user?.role || "agent"}>
            <div className="flex justify-end mt-3">
              <button
                onClick={saveDeletePolicy}
                disabled={
                  deletePolicySaving ||
                  permanentDeleteRolesDraft.length === 0 ||
                  !ownerRoles.some((role) => permanentDeleteRolesDraft.includes(role)) ||
                  JSON.stringify([...permanentDeleteRolesDraft].sort()) === JSON.stringify([...permanentDeleteRoles].sort())
                }
                className="flex items-center text-white text-sm font-medium px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none"
                type="button"
              >
                <CheckIcon className="w-4 h-4 mr-1" />
                {deletePolicySaving ? "Saving" : "Save Permissions"}
              </button>
            </div>
          </RoleWrapper>
        </div>
      </div>
    </section>
  );
}
