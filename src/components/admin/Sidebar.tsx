import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  UserCircleIcon,
  ChevronRightIcon,
  UsersIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { clearAuthStorage } from "../../utils/authStorage";
import { useTheme } from "../../context/ThemeContext";

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface User {
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export default function Sidebar({
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  const location = useLocation();
  const { theme } = useTheme();

  // Get user from localStorage
  let user: User | null = null;
  try {
    const stored = localStorage.getItem("user");
    user = stored ? JSON.parse(stored) : null;
  } catch {
    user = null;
  }
  const userName = user?.name || "Account";
  const userRole = user?.role || "";
  const userEmail = user?.email || "";

  // Account menu state
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close account menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    }
    if (accountOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountOpen]);

  // Logout handler
  const handleLogout = () => {
    clearAuthStorage();
    window.location.href = "/login";
  };

  // Function to check if link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="fixed top-4 right-4 z-50 p-2 bg-white text-black shadow-lg focus:outline-none block lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        {mobileOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Background overlay when mobile menu is open */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Sidebar overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          z-40 text-gray-900 transition-all duration-300 ease-in-out border-r border-gray-300
          ${mobileOpen ? "block fixed w-full" : "hidden"}
          lg:fixed lg:block lg:w-72 lg:h-full
        `}
      >
        <div className="flex flex-col h-full">
          <Link
            className="h-16 flex items-center w-full pl-5 border-b border-gray-300"
            to="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
          >
            <img
              className="h-10 w-auto"
              src={theme === "dark" ? "/logo-dark.png" : "/logo.png"}
              alt="Attentify logo"
            />
          </Link>

          <div className="flex-1 w-full overflow-y-auto max-h-screen">
            {/* Top menu */}
            <div className="flex flex-col items-start w-full mt-3">
              <Link
                to="/admin/dashboard"
                className={`flex items-center w-full h-12 px-4 mt-2 transition focus:outline-none ${
                  isActive("/admin/dashboard")
                    ? "bg-gray-100"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <HomeIcon className="w-6 h-6" />
                <span className="ml-3 text-base font-medium">Dashboard</span>
              </Link>

              <Link
                to="/admin/user"
                className={`flex items-center w-full h-12 px-4 mt-2 transition focus:outline-none ${
                  isActive("/admin/user") ? "bg-gray-100" : "hover:bg-gray-100"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <UsersIcon className="w-6 h-6" />
                <span className="ml-3 text-base font-medium">User</span>
              </Link>

              <Link
                to="/admin/governance"
                className={`flex items-center w-full h-12 px-4 mt-2 transition focus:outline-none ${
                  isActive("/admin/governance") ? "bg-gray-100" : "hover:bg-gray-100"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                <ShieldCheckIcon className="w-6 h-6" />
                <span className="ml-3 text-base font-medium">Governance</span>
              </Link>
            </div>
          </div>

          {/* Account (pinned bottom) */}
          <div
            className="border-t border-gray-300 w-full relative"
            ref={accountMenuRef}
          >
            <button
              className="flex items-center w-full h-12 px-4 hover:bg-gray-100 focus:outline-none relative"
              onClick={() => setAccountOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={accountOpen}
            >
              <UserCircleIcon className="w-6 h-6" />
              <span className="ml-3 text-base font-medium truncate max-w-[90px]">
                {userName}
              </span>
              <ChevronRightIcon
                className={`ml-auto w-4 h-4 transition-transform duration-200 ${
                  accountOpen ? "rotate-90" : ""
                }`}
              />
            </button>
            {accountOpen && (
              <div className="absolute bottom-12 left-0 w-full bg-gray-100 border border-gray-300 z-50 animate-fade-in">
                <div className="flex flex-col py-2">
                  <div className="px-4 py-2 text-gray-900 font-semibold border-b border-gray-300">
                    {userName}
                  </div>
                  <div className="px-4 py-1 text-sm text-gray-900 border-b border-gray-300">
                    {userRole}
                  </div>
                  <div className="px-4 py-1 text-sm text-gray-900 border-b border-gray-300">
                    {userEmail}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-left text-red-500 hover:bg-gray-300 hover:text-red-400 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
