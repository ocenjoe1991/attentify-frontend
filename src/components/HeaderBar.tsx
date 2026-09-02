import { useCompany } from "../context/CompanyContext";
import { usePageTitle } from "../context/PageTitleContext";

interface HeaderBarProps {
  onMenuClick: () => void;
  isMobile: boolean;
  showCompanySelector?: boolean;
}

export default function HeaderBar({
  onMenuClick,
  isMobile,
  showCompanySelector = true,
}: HeaderBarProps) {
  const { companies, currentCompanyId, setCurrentCompanyId } = useCompany();
  const { title } = usePageTitle();

  return (
    <div className="flex items-center justify-between px-5 h-16 border-b border-gray-300 bg-white z-[9999]">
      <div className="flex min-w-0 items-center gap-4">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="text-gray-700 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            Menu
          </button>
        )}
        <p className="truncate text-md font-semibold">{title}</p>
      </div>

      {showCompanySelector && companies.length > 0 && (
        <div className="ml-4 flex shrink-0 items-center">
          <select
            value={currentCompanyId}
            onChange={(e) => setCurrentCompanyId(e.target.value)}
            aria-label="Current company"
            className="h-9 w-48 max-w-[45vw] border border-gray-300 px-3 text-sm focus:border-blue-300 focus:outline-none focus:ring"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
