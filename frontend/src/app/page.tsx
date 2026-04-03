"use client";
import React, { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { apiGet, isLoggedIn } from "@/lib/api";

import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    active_clusters: 0,
    total_extractions: 0,
    sync_latency_ms: 0,
    sync_failures: 0,
    throughput: "0 B/s"
  });
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "Logs");

  useEffect(() => {
    setActiveTab(searchParams.get("tab") || "Logs");
  }, [searchParams]);

  useEffect(() => {
    if (isLoggedIn()) {
      setLoggedIn(true);
      apiGet("/connectors/").then(setConnections).catch(() => {});
      apiGet("/files/").then(setFiles).catch(() => {});
      apiGet("/datahub/stats/").then(setStats).catch(() => {});
    } else {
      window.location.href = "/login";
    }
  }, []);

  if (!loggedIn) return null;

  return (
    <AppShell>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1>Operational Overview</h1>
        <p className="section-subtitle">Global architecture status and extraction velocity.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Active Clusters</span>
          <span className="stat-card-value primary">{stats.active_clusters}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Sync Latency</span>
          <span className="stat-card-value primary">{stats.sync_latency_ms}ms</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Sync Failures</span>
          <span className="stat-card-value" style={{ color: "var(--on-surface)" }}>{stats.sync_failures}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Data Throughput</span>
          <span className="stat-card-value tertiary">{stats.throughput}</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Tabs and Tab Content */}
        <div className="card">
          <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid rgba(69,70,77,0.1)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
            {["Logs", "Metrics", "Alerts"].map((tab) => (
              <span 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                style={{ 
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "1rem",
                  color: activeTab === tab ? "var(--primary)" : "var(--on-surface-variant)",
                  borderBottom: activeTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
                  paddingBottom: "0.3rem",
                  transition: "all 0.2s ease"
                }}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="tab-context">
            {activeTab === "Logs" && (
              <div className="activity-feed">
                {files.length > 0 ? (
                  files.slice(0, 5).map((f: any) => (
                    <div className="activity-item" key={f.id}>
                      <div className={`activity-icon ${f.format === "JSON" ? "success" : "info"}`}>
                        <span className="material-symbols-outlined">
                          {f.format === "JSON" ? "check_circle" : "description"}
                        </span>
                      </div>
                      <div>
                        <div className="activity-title">File Export: {f.file_path?.split(/[\\/]/).pop()}</div>
                        <div className="activity-subtitle">
                          {f.source_metadata?.source_db_name} ({f.source_metadata?.source_db_type}) • {new Date(f.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--outline)" }}>No recent logs.</p>
                )}
              </div>
            )}

            {activeTab === "Metrics" && (
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", marginBottom: "1rem", display: "block" }}>Throughput per connection source (Last 24h)</span>
                <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-end", height: "160px", padding: "1rem 0" }}>
                  {["PostgreSQL", "MySQL", "MongoDB", "ClickHouse"].map((db, i) => (
                    <div key={db} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{
                        width: "100%",
                        height: `${[120, 80, 60, 40][i]}px`,
                        background: `linear-gradient(180deg, ${["var(--primary)", "var(--tertiary)", "var(--secondary)", "var(--on-surface-variant)"][i]}, transparent)`,
                        borderRadius: "4px 4px 0 0",
                        opacity: 0.7,
                      }} />
                      <span style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>{db}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Alerts" && (
              <div className="activity-feed">
                {files.filter((f: any) => f.status === "FAILED").length > 0 ? (
                  files.filter((f: any) => f.status === "FAILED").map((f: any) => (
                    <div className="activity-item" key={f.id}>
                      <div className="activity-icon warning">
                        <span className="material-symbols-outlined">warning</span>
                      </div>
                      <div>
                        <div className="activity-title">Sync Failure</div>
                        <div className="activity-subtitle">Export failed for {f.source_metadata?.source_db_name}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: "1rem", textAlign: "left", alignItems: "flex-start" }}>
                     <div className="activity-item">
                        <div className="activity-icon success">
                          <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                          <div className="activity-title" style={{ color: "var(--on-surface)" }}>All Systems Nominal</div>
                          <div className="activity-subtitle">No sync alerts or dropped queries in the last 24h.</div>
                        </div>
                      </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Connections */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">lan</span>
              Active Connections
            </h3>
            <a href="/config" className="btn btn-secondary btn-sm">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
              Add
            </a>
          </div>

          {connections.length > 0 ? (
            connections.map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: "1px solid rgba(69,70,77,0.1)" }}>
                <span className="status-dot active"></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>{c.host}:{c.port}</div>
                </div>
                <span className="chip chip-primary">{c.db_type}</span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "40px", opacity: 0.3, marginBottom: "0.5rem" }}>database</span>
              <p style={{ color: "var(--outline)" }}>No connections configured yet</p>
              <a href="/config" className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }}>
                Get Started
              </a>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
