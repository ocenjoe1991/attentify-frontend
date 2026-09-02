import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../../layouts/Layout";
import { usePageTitle } from "../../context/PageTitleContext";
import GeneralSettings from "../../components/GeneralSettings";
import TeamMembers from "../../components/TeamMembers";
import AuditLogSection from "../../components/AuditLogSection";
import ApprovalRequests from "../../components/ApprovalRequests";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../context/ThemeContext";

export default function Settings() {
  const { setTitle } = usePageTitle();
  const { theme, setTheme } = useTheme();
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
      <div className="mx-auto w-full max-w-[90rem] p-4">
        <section className="mb-5 border border-gray-300 p-5">
          <h2 className="text-base font-semibold">Appearance</h2>
          <div className="mt-4 inline-flex border border-gray-300" role="group" aria-label="Color theme">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex h-9 items-center gap-2 px-3 text-sm font-medium transition-colors ${
                theme === "light" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              aria-pressed={theme === "light"}
            >
              <SunIcon className="h-4 w-4" aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex h-9 items-center gap-2 border-l border-gray-300 px-3 text-sm font-medium transition-colors ${
                theme === "dark" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
              aria-pressed={theme === "dark"}
            >
              <MoonIcon className="h-4 w-4" aria-hidden="true" />
              Dark
            </button>
          </div>
        </section>

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
