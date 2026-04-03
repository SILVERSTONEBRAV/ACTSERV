"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logout, apiGet, isLoggedIn } from "@/lib/api";
import { useToast } from "@/components/Toast";

const navItems = [
  { href: "/", icon: "dashboard", label: "Dashboard" },
  { href: "/config", icon: "database", label: "Connections" },
  { href: "/extract", icon: "alt_route", label: "Extraction" },
  { href: "/grid", icon: "grid_on", label: "Data Grid" },
  { href: "/files", icon: "folder_open", label: "Storage" },
];

const secondaryNav = [
  { href: "/settings", icon: "settings", label: "Settings" },
  { href: "/support", icon: "help_outline", label: "Support" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const activeTopTab = searchParams.get("tab") || "Logs";

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Fetch actual user info
    if (isLoggedIn()) {
      apiGet("/auth/me/").then(setCurrentUser).catch(() => {});
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Derive display values from real user data
  const displayName = currentUser?.username || "Operator";
  const isAdmin = currentUser?.is_staff || currentUser?.is_superuser;
  const roleName = isAdmin ? "Admin Access" : "Standard User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <span className="material-symbols-outlined">
          {sidebarOpen ? "close" : "menu"}
        </span>
      </button>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h2>ACTSERV</h2>
          <span>Technical Director</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </a>
          ))}

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "0.125rem" }}>
            {secondaryNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={pathname === item.href ? "active" : ""}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-role" style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span className={`status-dot ${isAdmin ? "active" : ""}`} style={{ width: "6px", height: "6px" }}></span>
                {roleName}
              </div>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "0.75rem", width: "100%" }}
            onClick={logout}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-tabs">
            {pathname === "/" ? (
              <>
                <a href="/?tab=Logs" className={activeTopTab === "Logs" ? "active" : ""}>Logs</a>
                <a href="/?tab=Metrics" className={activeTopTab === "Metrics" ? "active" : ""}>Metrics</a>
                <a href="/?tab=Alerts" className={activeTopTab === "Alerts" ? "active" : ""}>Alerts</a>
              </>
            ) : (
               <a href="/" style={{ color: 'var(--on-surface-variant)', textDecoration: 'none' }}>&larr; Back to Dashboard</a>
            )}
          </div>
          <div className="top-bar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={toggleTheme}
              data-tooltip={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-symbols-outlined theme-toggle-icon" style={{ fontSize: "16px" }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button className="btn btn-secondary btn-sm" data-tooltip="Notifications" onClick={() => addToast("No new notifications.", "info")}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>notifications</span>
            </button>
          </div>
        </div>

        <div className="page-content fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
