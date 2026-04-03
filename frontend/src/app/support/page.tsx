"use client";
import React from "react";
import AppShell from "@/components/AppShell";
import { useToast } from "@/components/Toast";

export default function SupportPage() {
  const { addToast } = useToast();

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToast("Support ticket has been dispatched. A technician will review it shortly.", "success");
  };

  return (
    <AppShell>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Platform Support</h1>
        <p className="section-subtitle">Documentation, SLA contact, and technical architecture references.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">contact_support</span>
              Submit a Ticket
            </h3>
          </div>
          <form onSubmit={handleTicketSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            <div>
              <label className="input-label">Issue Categories</label>
              <select className="input-field" required style={{ appearance: "auto" }}>
                <option>Database Connector Fault</option>
                <option>Schema Mapping Error</option>
                <option>Extraction Timeout</option>
                <option>Storage Node Failure</option>
                <option>Authentication Issue</option>
              </select>
            </div>
            
            <div>
              <label className="input-label">System Diagnostics Context</label>
              <textarea 
                className="input-field" 
                rows={5} 
                required 
                placeholder="Include recent query logs or failing connector host details..." 
              />
            </div>
            
            <button className="btn btn-primary" type="submit" style={{ marginTop: "0.5rem" }}>
              Raise Incident
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">library_books</span>
              Luminous Architect Guidelines
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" }}>
             <div>
                <a href="/docs/connection-string" onClick={e => { e.preventDefault(); addToast("Opening documentation cluster...", "info"); }} style={{ fontWeight: 500, color: "var(--primary)", textDecoration: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
                  How to Build Valid Connection Strings
                </a>
                <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>
                  Guidelines for MySQL, ClickHouse, PostgreSQL, and passing Mongo URIs properly into the abstractor engine.
                </div>
              </div>
              <div>
                <a href="/docs/json-schema" onClick={e => { e.preventDefault(); addToast("Opening documentation cluster...", "info"); }} style={{ fontWeight: 500, color: "var(--primary)", textDecoration: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
                  Understanding Dual-Storage Artifacts
                </a>
                <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>
                  A brief technical breakdown of how the platform mirrors grid inputs onto pure storage clusters (JSON/CSV) without locking your relational core.
                </div>
              </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
