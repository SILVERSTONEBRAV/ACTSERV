"use client";
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiGet, isLoggedIn } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [user, setUser] = useState({ username: "", email: "" });
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    
    // Fetch current user details
    apiGet("/auth/me/")
      .then((data) => {
        setUser({
          username: data.username || "Admin",
          email: data.email || "admin@example.com",
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = () => {
    addToast("Settings successfully updated", "success");
  };

  if (loading) return null;

  return (
    <AppShell>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Global Settings</h1>
        <p className="section-subtitle">Manage your account and platform preferences.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">person</span>
              Profile details
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
          
          <button className="btn btn-primary" onClick={handleSave}>
            Update Profile
          </button>
        </div>

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
      </div>
    </AppShell>
  );
}
