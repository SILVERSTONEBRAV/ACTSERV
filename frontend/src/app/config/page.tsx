"use client";
import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { apiGet, apiPost, apiDelete, isLoggedIn } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function ConfigPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    active_clusters: 0,
    total_extractions: 0,
    sync_latency_ms: 0,
    sync_failures: 0,
    throughput: "0 B/s"
  });
  const [form, setForm] = useState({ name: "", db_type: "POSTGRES", host: "", port: "", username: "", password: "", database_name: "" });
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    apiGet("/auth/me/").then((u) => setIsAdmin(u.is_staff || u.is_superuser)).catch(() => {});
    loadConnections();
    loadStats();
  }, []);

  const loadConnections = () => {
    apiGet("/connectors/").then(setConnections).catch(() => {});
  };

  const loadStats = () => {
    apiGet("/datahub/stats/").then(setStats).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/connectors/", form);
      setForm({ name: "", db_type: "POSTGRES", host: "", port: "", username: "", password: "", database_name: "" });
      loadConnections();
      loadStats();
      addToast("Connection deployed successfully", "success");
    } catch { addToast("Failed to deploy connection", "error"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this connection?")) return;
    await apiDelete(`/connectors/${id}/`);
    loadConnections();
    loadStats();
  };

  const handleTest = async (conn: any) => {
    setTesting(conn.id);
    try {
      const query = conn.db_type === "MONGO" ? conn.database_name : "SELECT 1";
      await apiPost(`/connectors/${conn.id}/extract/`, { query, batch_size: 1, offset: 0 });
      setTestResult(prev => ({ ...prev, [conn.id]: "success" }));
      addToast(`${conn.name} — Connection verified`, "success");
      loadStats(); // Update stats as testing generates file
    } catch {
      setTestResult(prev => ({ ...prev, [conn.id]: "error" }));
      addToast(`${conn.name} — Connection failed`, "error");
      loadStats(); // Update errors
    } finally {
      setTesting(null);
    }
  };

  const portDefaults: Record<string, string> = { POSTGRES: "5432", MYSQL: "3306", MONGO: "27017", CLICKHOUSE: "8123" };

  return (
    <AppShell>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1>Connection Architecture</h1>
        <p className="section-subtitle">
          Configure high-performance ingress points for your data pipelines. Secure, multi-tenant database clusters managed from a single architectural control plane.
        </p>
      </div>

      {/* Stats Row */}
      <div className="stat-grid" style={{ marginBottom: "2rem" }}>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Active Clusters</span>
          <span className="stat-card-value primary">{stats.active_clusters}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Sync Latency</span>
          <span className="stat-card-value tertiary">{stats.sync_latency_ms}ms</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Sync Failures</span>
          <span className="stat-card-value">{stats.sync_failures}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label" style={{ textTransform: "uppercase" }}>Data Throughput</span>
          <span className="stat-card-value">{stats.throughput}</span>
        </div>
      </div>

      <div className="grid-2">
        {/* Add New Connection — Admin Only */}
        {isAdmin ? (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">add_circle</span>
              Provision New Node
            </h3>
          </div>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div>
              <label className="input-label">Connection Name</label>
              <input className="input-field" placeholder="e.g. Production PostgreSQL" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Database Engine</label>
              <select className="input-field" value={form.db_type} onChange={e => setForm({ ...form, db_type: e.target.value, port: portDefaults[e.target.value] || "" })}>
                <option value="POSTGRES">PostgreSQL</option>
                <option value="MYSQL">MySQL</option>
                <option value="MONGO">MongoDB</option>
                <option value="CLICKHOUSE">ClickHouse</option>
              </select>
            </div>
            <div className="grid-2" style={{ gap: "0.75rem" }}>
              <div>
                <label className="input-label">Host Address</label>
                <input className="input-field" placeholder="192.168.1.104" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required />
              </div>
              <div>
                <label className="input-label">Port</label>
                <input type="number" className="input-field" placeholder={portDefaults[form.db_type]} value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="input-label">Database Name</label>
              <input className="input-field" placeholder="analytics_v4" value={form.database_name} onChange={e => setForm({ ...form, database_name: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">User Principal</label>
              <input className="input-field" placeholder="arch_admin" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Credentials</label>
              <input type="password" className="input-field" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>cloud_upload</span>
              Deploy Connection
            </button>
          </form>

          {/* Security Badge */}
          <div className="security-badge" style={{ marginTop: "1rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>shield</span>
            Your connection strings are encrypted using AES-256-GCM. Rotate keys every 90 days for optimal compliance.
          </div>
        </div>
        ) : (
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">lock</span>
              Restricted Access
            </h3>
          </div>
          <div className="empty-state" style={{ padding: "2rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.3 }}>admin_panel_settings</span>
            <p style={{ marginTop: "0.75rem", color: "var(--on-surface-variant)" }}>Only administrators can provision or modify database connections.</p>
            <p style={{ fontSize: "0.8rem", color: "var(--outline)", marginTop: "0.5rem" }}>Contact your admin to request connection changes.</p>
          </div>
        </div>
        )}

        {/* Existing Connections */}
        <div>
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">dns</span>
              Secondary Nodes
            </h3>
          </div>

          {connections.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.3 }}>hub</span>
                <p style={{ marginTop: "0.75rem" }}>No nodes provisioned yet. Deploy your first connection.</p>
              </div>
            </div>
          ) : (
            connections.map((c: any) => (
              <div className="card" key={c.id} style={{ marginBottom: "0.75rem", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span className={`status-dot ${testResult[c.id] === "error" ? "error" : "active"}`}></span>
                      <h3 style={{ fontSize: "1rem" }}>{c.name}</h3>
                      <span className="chip chip-primary">{c.db_type}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 1rem" }}>
                      <span>Host Address</span><span style={{ color: "var(--on-surface)" }}>{c.host}</span>
                      <span>Port</span><span style={{ color: "var(--on-surface)" }}>{c.port}</span>
                      <span>Database</span><span style={{ color: "var(--on-surface)" }}>{c.database_name}</span>
                      <span>User Principal</span><span style={{ color: "var(--on-surface)" }}>{c.username}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button className="btn btn-tertiary btn-sm" onClick={() => handleTest(c)} disabled={testing === c.id}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>speed</span>
                    {testing === c.id ? "Testing..." : "Test"}
                  </button>
                  {isAdmin && (
                  <button className="btn btn-sm" onClick={() => handleDelete(c.id)} style={{ background: "rgba(255,180,171,0.1)", color: "var(--error)", border: "none" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                    Remove
                  </button>
                  )}
                  {testResult[c.id] && (
                    <span className={`chip ${testResult[c.id] === "success" ? "chip-primary" : "chip-error"}`}>
                      {testResult[c.id] === "success" ? "✓ Connected" : "✗ Failed"}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
