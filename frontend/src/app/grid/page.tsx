"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { apiPost, isLoggedIn } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function GridPage() {
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [modifiedRows, setModifiedRows] = useState<Set<number>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    const rawData = localStorage.getItem("extracted_data");
    const connId = localStorage.getItem("extracted_connection_id");
    if (rawData) {
      const parsed = JSON.parse(rawData);
      setData(parsed);
      setOriginalData(JSON.parse(rawData));
      if (parsed.length > 0) setColumns(Object.keys(parsed[0]));
    }
    if (connId) setConnectionId(connId);
  }, []);

  const handleCellChange = (rowIndex: number, colKey: string, newValue: string) => {
    // Basic validation
    const errKey = `${rowIndex}-${colKey}`;
    if (newValue.trim() === "" && colKey === "id") {
      setValidationErrors(prev => ({ ...prev, [errKey]: "ID cannot be empty" }));
    } else {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[errKey];
        return copy;
      });
    }

    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [colKey]: newValue };
    setData(newData);
    setModifiedRows(prev => new Set(prev).add(rowIndex));
  };

  const handleSubmit = async (format: string) => {
    if (Object.keys(validationErrors).length > 0) {
      addToast("Fix validation errors before submitting.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost("/datahub/submit/", {
        connection_id: connectionId,
        rows: data,
        format,
      });
      if (res.success) {
        addToast(`${res.message}`, "success");
        setModifiedRows(new Set());
        router.push("/files");
      } else {
        addToast(`Error: ${res.error || "Unknown"}`, "error");
      }
    } catch (e: any) {
      addToast("Submission failed: " + e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = searchTerm
    ? data.filter(row => Object.values(row).some((v: any) => String(v).toLowerCase().includes(searchTerm.toLowerCase())))
    : data;

  if (data.length === 0) {
    return (
      <AppShell>
        <h1 style={{ marginBottom: "1rem" }}>Editable Data Grid</h1>
        <div className="card">
          <div className="empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: "64px", opacity: 0.3 }}>grid_on</span>
            <h3 style={{ marginTop: "1rem", color: "var(--on-surface-variant)" }}>No Data Loaded</h3>
            <p style={{ color: "var(--outline)", marginTop: "0.5rem" }}>Navigate to the Extraction page to pull data from a configured source.</p>
            <a href="/extract" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>alt_route</span>
              Go to Extraction
            </a>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1>Entity Schema Grid</h1>
          <p className="section-subtitle">Direct manipulation of extracted node data. Inline validation enabled. All changes are staged locally until submission.</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "1.5rem" }}>
        {/* Validation Drift Panel */}
        <div className="card-elevated card" style={{ background: "var(--surface-container-high)" }}>
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">analytics</span>
              Entity Validation Drift
            </h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="stat-card">
              <span className="stat-card-label">Total Rows</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem" }}>{data.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Modified</span>
              <span className="stat-card-value primary" style={{ fontSize: "1.25rem" }}>{modifiedRows.size}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Errors</span>
              <span className="stat-card-value" style={{ fontSize: "1.25rem", color: Object.keys(validationErrors).length > 0 ? "var(--error)" : "var(--primary)" }}>
                {Object.keys(validationErrors).length}
              </span>
            </div>
          </div>
        </div>

        {/* Schema Health + Actions */}
        <div className="card-elevated card" style={{ background: "var(--surface-container-high)" }}>
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">health_and_safety</span>
              Schema Health
            </h3>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>Data Integrity</span>
              <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                {Object.keys(validationErrors).length === 0 ? "100%" : `${Math.round(((data.length * columns.length - Object.keys(validationErrors).length) / (data.length * columns.length)) * 100)}%`}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: Object.keys(validationErrors).length === 0 ? "100%" : "85%" }}></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-secondary" onClick={() => handleSubmit("CSV")} disabled={submitting}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={() => handleSubmit("JSON")} disabled={submitting}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>cloud_upload</span>
              {submitting ? "Submitting..." : "Submit JSON"}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          className="input-field"
          placeholder="Search across all columns..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: "400px" }}
        />
      </div>

      {/* Data Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              {columns.map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => {
              const actualIndex = data.indexOf(row);
              const isModified = modifiedRows.has(actualIndex);
              return (
                <tr key={actualIndex} style={isModified ? { borderLeft: "3px solid var(--primary)" } : {}}>
                  <td style={{ fontSize: "0.75rem", color: "var(--outline)" }}>{actualIndex + 1}</td>
                  {columns.map(col => {
                    const errKey = `${actualIndex}-${col}`;
                    const hasError = validationErrors[errKey];
                    return (
                      <td key={col} style={hasError ? { background: "rgba(255,180,171,0.05)" } : {}}>
                        <input
                          value={row[col] != null ? String(row[col]) : ""}
                          onChange={(e) => handleCellChange(actualIndex, col, e.target.value)}
                          title={hasError || ""}
                          style={hasError ? { borderColor: "var(--error)" } : {}}
                        />
                        {hasError && <div style={{ fontSize: "0.65rem", color: "var(--error)", padding: "0 0.5rem" }}>{hasError}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
