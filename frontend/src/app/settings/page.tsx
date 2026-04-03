"use client";
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiGet, apiPatch, apiDelete, isLoggedIn } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [user, setUser] = useState<any>({ username: "", email: "", is_staff: false });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }

    apiGet("/auth/me/")
      .then((data) => {
        setUser(data);
        setLoading(false);
        // If admin, also fetch all users
        if (data.is_staff || data.is_superuser) {
          apiGet("/auth/users/").then(setUsers).catch(() => {});
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = () => {
    addToast("Settings successfully updated", "success");
  };

  const handleRoleChange = async (userId: number, newIsStaff: boolean) => {
    try {
      const updated = await apiPatch(`/auth/users/${userId}/role/`, { is_staff: newIsStaff });
      if (updated?.error) {
        addToast(updated.error, "error");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_staff: newIsStaff } : u))
      );
      addToast(`Role updated to ${newIsStaff ? "Admin" : "Standard User"}`, "success");
    } catch (e: any) {
      addToast("Failed to update role: " + e.message, "error");
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await apiDelete(`/auth/users/${userId}/`);
      if (res && res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        addToast(`User "${username}" deleted`, "success");
      } else {
        addToast("Failed to delete user", "error");
      }
    } catch (e: any) {
      addToast("Failed to delete user: " + e.message, "error");
    }
  };

  const isAdmin = user?.is_staff || user?.is_superuser;

  if (loading) return null;

  return (
    <AppShell>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Global Settings</h1>
        <p className="section-subtitle">Manage your account, platform preferences, and user access control.</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          className={`btn ${activeTab === "profile" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("profile")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person</span>
          Profile
        </button>
        {isAdmin && (
          <button
            className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>group</span>
            User Management
          </button>
        )}
        <button
          className={`btn ${activeTab === "system" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("system")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>tune</span>
          System
        </button>
      </div>

      {/* ====== PROFILE TAB ====== */}
      {activeTab === "profile" && (
        <div className="grid-2">
          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <span className="material-symbols-outlined">person</span>
                Profile Details
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label className="input-label">Username</label>
                <input type="text" className="input-field" value={user.username} disabled />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input type="email" className="input-field" defaultValue={user.email} />
              </div>
              <div>
                <label className="input-label">Password</label>
                <input type="password" className="input-field" defaultValue="**********" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSave}>Update Profile</button>
          </div>

          <div className="card">
            <div className="section-header">
              <h3 className="section-title">
                <span className="material-symbols-outlined">badge</span>
                Account Info
              </h3>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--surface-container-high)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)" }}>Current Role</span>
                <span className={`chip ${isAdmin ? "chip-primary" : "chip-secondary"}`}>
                  {isAdmin ? "Administrator" : "Standard User"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--surface-container-high)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)" }}>User ID</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, fontFamily: "monospace" }}>#{user.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "var(--surface-container-high)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)" }}>Permissions</span>
                <span style={{ fontSize: "0.85rem" }}>
                  {isAdmin ? "Full access to all resources" : "Own resources + shared files"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== USER MANAGEMENT TAB (Admin Only) ====== */}
      {activeTab === "users" && isAdmin && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">group</span>
              User Management
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
              {users.length} registered users
            </span>
          </div>

          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="stat-card">
              <span className="stat-card-label">Total Users</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{users.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Admins</span>
              <span className="stat-card-value primary" style={{ fontSize: "1.25rem" }}>
                {users.filter((u) => u.is_staff || u.is_superuser).length}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Standard Users</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>
                {users.filter((u) => !u.is_staff && !u.is_superuser).length}
              </span>
            </div>
          </div>

          {/* Users Table */}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === user.id;
                  const isUserAdmin = u.is_staff || u.is_superuser;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--outline)" }}>
                        #{u.id}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {u.username}
                        {isSelf && <span style={{ fontSize: "0.7rem", color: "var(--primary)", marginLeft: "0.5rem" }}>(you)</span>}
                      </td>
                      <td style={{ fontSize: "0.85rem", color: "var(--on-surface-variant)" }}>
                        {u.email || "—"}
                      </td>
                      <td>
                        <span className={`chip ${isUserAdmin ? "chip-primary" : "chip-secondary"}`}>
                          {isUserAdmin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td>
                        {isSelf ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--outline)", fontStyle: "italic" }}>
                            Cannot modify self
                          </span>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRoleChange(u.id, !isUserAdmin)}
                              title={isUserAdmin ? "Demote to Standard User" : "Promote to Admin"}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                                {isUserAdmin ? "arrow_downward" : "arrow_upward"}
                              </span>
                              {isUserAdmin ? "Demote" : "Promote"}
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              style={{ color: "var(--error)" }}
                              title="Delete user"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== SYSTEM TAB ====== */}
      {activeTab === "system" && (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">tune</span>
              System Preferences
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid rgba(69,70,77,0.1)" }}>
              <div>
                <div style={{ fontWeight: 500, color: "var(--on-surface)" }}>Email Notifications</div>
                <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Receive alerts when a data export drops.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--primary)", width: "18px", height: "18px" }} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid rgba(69,70,77,0.1)" }}>
              <div>
                <div style={{ fontWeight: 500, color: "var(--on-surface)" }}>Auto-retry Syncs</div>
                <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Automatically re-queue failed database connections.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--primary)", width: "18px", height: "18px" }} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 500, color: "var(--on-surface)" }}>Strict Type Casting</div>
                <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>Throw errors instead of coercing data types silently.</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: "var(--primary)", width: "18px", height: "18px" }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
