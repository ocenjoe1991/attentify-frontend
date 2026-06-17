import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../../layouts/Layout";
import { usePageTitle } from "../../context/PageTitleContext";
import GeneralSettings from "../../components/GeneralSettings";
import TeamMembers from "../../components/TeamMembers";
import AuditLogSection from "../../components/AuditLogSection";
import ApprovalRequests from "../../components/ApprovalRequests";

export default function Settings() {
  const { setTitle } = usePageTitle();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "general");

  useEffect(() => {
    setTitle("Company Settings");
  }, [setTitle]);

  useEffect(() => {
    const tab = searchParams.get("tab") || "general";
    setActiveTab(tab);
  }, [searchParams]);

  const tabs = [
    { id: "general", label: "General" },
    { id: "team", label: "Team Members" },
    { id: "audit", label: "Audit Log" },
    { id: "approvals", label: "Approval Requests" },
  ];

  return (
    <Layout>
      <div className="p-4 max-w-5xl">
        {/* Tabs */}
        <div className="mb-5 border-b border-gray-300">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchParams({ tab: tab.id });
                }}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "border-b-2 border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <div className="border border-gray-300 p-8 mb-5">
            <GeneralSettings />
          </div>
        )}

        {activeTab === "team" && (
          <div className="border border-gray-300 p-8">
            <TeamMembers />
          </div>
        )}

        {activeTab === "audit" && (
          <div className="border border-gray-300 p-8 mt-5">
            <AuditLogSection />
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="border border-gray-300 p-8">
            <ApprovalRequests />
          </div>
        )}
      </div>
    </Layout>
  );
}
