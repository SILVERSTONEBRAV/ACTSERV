"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { apiGet, apiPost, isLoggedIn } from "@/lib/api";

export default function ExtractPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [query, setQuery] = useState("SELECT * FROM auth_user");
  const [batchSize, setBatchSize] = useState(50);
  const [isExtracting, setIsExtracting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [recentExtractions, setRecentExtractions] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState("00:00:00");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    apiGet("/connectors/").then((data) => {
      setConnections(data);
      if (data.length > 0) setSelectedConnection(data[0].id);
    });
  }, []);

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  };

  const handleExtract = async () => {
    if (!selectedConnection) return;
    setIsExtracting(true);
    setProgress(0);
    addLog("Initializing extraction pipeline...");

    const conn = connections.find((c: any) => c.id == selectedConnection);
    addLog(`Target: ${conn?.name} (${conn?.db_type})`);
    addLog(`Query: ${query}`);
    addLog(`Batch size: ${batchSize}`);

    setProgress(30);
    const startTime = Date.now();
    const timer = setInterval(() => {
      const diff = Date.now() - startTime;
      const s = Math.floor(diff / 1000) % 60;
      const m = Math.floor(diff / 60000) % 60;
      setElapsed(`00:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);

    try {
      const data = await apiPost(`/connectors/${selectedConnection}/extract/`, {
        query, batch_size: batchSize, offset: 0,
      });

      setProgress(100);
      clearInterval(timer);

      if (data.data) {
        addLog(`✓ Extraction complete. ${data.data.length} rows fetched.`);
        localStorage.setItem("extracted_data", JSON.stringify(data.data));
        localStorage.setItem("extracted_connection_id", String(selectedConnection));
        setRecentExtractions(prev => [{
          id: Date.now(),
          source: conn?.name,
          type: conn?.db_type,
          rows: data.data.length,
          time: new Date().toLocaleString(),
        }, ...prev]);
        setTimeout(() => router.push("/grid"), 1500);
      } else {
        addLog("⚠ No data returned. Check your query.");
      }
    } catch (e: any) {
      addLog(`✗ Extraction failed: ${e.message || "Unknown error"}`);
      setProgress(0);
      clearInterval(timer);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1>Data Extraction & Batching</h1>
          <p className="section-subtitle">Configure extraction parameters, execute pipelines, and monitor real-time progress.</p>
        </div>
        <span className="chip chip-primary" style={{ fontSize: "0.75rem" }}>
          <span className="status-dot active"></span>
          STATUS: ONLINE
        </span>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        {/* Extraction Configuration */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">tune</span>
              Extraction Configuration
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div>
              <label className="input-label">Target Connection</label>
              <select className="input-field" value={selectedConnection} onChange={e => setSelectedConnection(e.target.value)}>
                {connections.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.db_type})</option>
                ))}
                {connections.length === 0 && <option value="">No connections available</option>}
              </select>
            </div>
            <div>
              <label className="input-label">Query / Collection</label>
              <textarea
                className="input-field"
                rows={3}
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ fontFamily: "monospace", resize: "vertical" }}
              />
              <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>
                For MongoDB: use collection name. For SQL: write your query.
              </div>
            </div>
            <div>
              <label className="input-label">Batch Size</label>
              <input type="number" className="input-field" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} min={1} max={10000} />
            </div>
            <button className="btn btn-primary" onClick={handleExtract} disabled={isExtracting || !selectedConnection} style={{ width: "100%" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>play_arrow</span>
              {isExtracting ? "Extracting..." : "Execute Extraction"}
            </button>
          </div>
        </div>

        {/* Operational Progress */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">analytics</span>
              Operational Progress
            </h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="stat-card">
              <span className="stat-card-label">Time Elapsed</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem", fontFamily: "monospace" }}>{elapsed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Throttling</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>0 ms</span>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>Pipeline Progress</span>
              <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          {/* System Logs */}
          <div className="section-header" style={{ marginTop: "1rem" }}>
            <h3 className="section-title" style={{ fontSize: "0.875rem" }}>
              <span className="material-symbols-outlined">receipt_long</span>
              System Logs
            </h3>
          </div>
          <div style={{
            background: "var(--surface-container-lowest)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem",
            maxHeight: "200px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.75rem",
          }}>
            {logs.length === 0 ? (
              <div style={{ color: "var(--outline)", fontStyle: "italic" }}>Awaiting pipeline execution...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ padding: "0.25rem 0", color: log.includes("✗") ? "var(--error)" : log.includes("✓") ? "var(--primary)" : "var(--on-surface-variant)" }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Extractions Table */}
      <div className="card">
        <div className="section-header">
          <h3 className="section-title">
            <span className="material-symbols-outlined">history</span>
            Recent Extractions
          </h3>
        </div>
        {recentExtractions.length > 0 ? (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Rows</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExtractions.map((ex) => (
                  <tr key={ex.id}>
                    <td style={{ fontWeight: 600 }}>{ex.source}</td>
                    <td><span className="chip chip-secondary">{ex.type}</span></td>
                    <td>{ex.rows}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)" }}>{ex.time}</td>
                    <td><span className="chip chip-primary">Complete</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "40px", opacity: 0.3 }}>science</span>
            <p style={{ marginTop: "0.5rem" }}>No extractions performed yet</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
