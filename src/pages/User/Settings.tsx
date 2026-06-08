import { useEffect } from "react";
import Layout from "../../layouts/Layout";
import { usePageTitle } from "../../context/PageTitleContext";
import GeneralSettings from "../../components/GeneralSettings";
import TeamMembers from "../../components/TeamMembers";
import AuditLogSection from "../../components/AuditLogSection";

export default function Settings() {
  const { setTitle } = usePageTitle();

  useEffect(() => {
    setTitle("Company Settings");
  }, [setTitle]);

  return (
    <Layout>
      <div className="p-4 max-w-5xl">
        <div className="border border-gray-300 p-8 mb-5">
          <GeneralSettings />
        </div>

        <div className="border border-gray-300 p-8">
          <TeamMembers />
        </div>

        <div className="border border-gray-300 p-8 mt-5">
          <AuditLogSection />
        </div>
      </div>
    </Layout>
  );
}
