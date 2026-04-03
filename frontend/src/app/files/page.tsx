"use client";
import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { apiGet, apiPost, isLoggedIn } from "@/lib/api";

export default function FilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = "/login"; return; }
    apiGet("/auth/me/").then((u) => setIsAdmin(u.is_staff || u.is_superuser)).catch(() => {});
    apiGet("/files/").then(setFiles).catch(() => {});
  }, []);

  const handlePreview = async (file: any) => {
    setSelectedFile(file);
    setLoadingPreview(true);
    try {
      const data = await apiGet(`/files/${file.id}/preview/`);
      setPreview(data);
    } catch {
      setPreview({ error: "Could not load preview" });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = (file: any) => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/files/${file.id}/download/`, "_blank");
  };

  const totalSizeBytes = files.reduce((sum: number, f: any) => sum + (f.file_size_bytes || 0), 0);
  const totalSize = totalSizeBytes > 1024 * 1024
    ? `${(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : totalSizeBytes > 1024
    ? `${(totalSizeBytes / 1024).toFixed(1)} KB`
    : `${totalSizeBytes} B`;


  return (
    <AppShell>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1>Storage & Files</h1>
        <p className="section-subtitle">
          {isAdmin
            ? "Manage the processed extraction payloads and structured records. As an Admin, you have global visibility across all system tenants."
            : "View and download your exported files and shared resources."}
        </p>
      </div>

      <div className="grid-2">
        {/* Left: File Manifest + Stats */}
        <div>
          {/* File Manifest */}
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="section-header">
              <h3 className="section-title">
                <span className="material-symbols-outlined">export_notes</span>
                Exported File Manifest
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>{files.length} files</span>
            </div>

            {files.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", opacity: 0.3 }}>cloud_off</span>
                <p style={{ marginTop: "0.75rem" }}>No exported files yet. Submit data from the Data Grid.</p>
              </div>
            ) : (
              files.map((file: any) => (
                <div
                  className="file-item"
                  key={file.id}
                  onClick={() => handlePreview(file)}
                  style={{ cursor: "pointer", border: selectedFile?.id === file.id ? "1px solid var(--primary)" : "1px solid transparent" }}
                >
                  <div className="file-info">
                    <div className={`file-icon ${file.format?.toLowerCase()}`}>
                      <span className="material-symbols-outlined">
                        {file.format === "JSON" ? "data_object" : "table_chart"}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                        {file.file_path?.split(/[\\/]/).pop()}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                        Owner: {file.owner_name || file.owner || "System"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className="chip chip-secondary">{file.format}</span>
                    <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleDownload(file); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Stats Row */}
          <div className="grid-3">
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ fontSize: "0.85rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>storage</span>
                Structured Records
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                Direct access to the normalized database tables and relational schemas.
              </p>
            </div>
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>Storage Utilization</h3>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                <span>Cold Storage</span>
                <span style={{ color: "var(--on-surface)" }}>{totalSize}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--on-surface-variant)", marginTop: "0.25rem" }}>
                <span>Retention</span>
                <span style={{ color: "var(--on-surface)" }}>90 Days</span>
              </div>
            </div>
            <div className="card" style={{ padding: "1rem" }}>
              <h3 style={{ fontSize: "0.85rem", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>lock</span>
                Access Control
              </h3>
              <div style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
                <div>
                  <span className={`chip ${isAdmin ? "chip-primary" : "chip-secondary"}`} style={{ marginRight: "0.5rem" }}>
                    {isAdmin ? "Admin" : "User"}
                  </span>
                  {isAdmin ? "Global visibility" : "Personal + shared files"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: File Preview */}
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">
              <span className="material-symbols-outlined">preview</span>
              Instant Content Previewer
            </h3>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", marginBottom: "1rem" }}>
            Select any file from the manifest to instantly parse its structure.
          </p>

          {!selectedFile ? (
            <div className="preview-panel">
              <div className="preview-empty">
                <span className="material-symbols-outlined">visibility</span>
                <p style={{ fontSize: "0.85rem" }}>SELECT A FILE TO INITIALIZE PREVIEW ENGINE</p>
              </div>
            </div>
          ) : loadingPreview ? (
            <div className="preview-panel">
              <div className="preview-empty">
                <span className="material-symbols-outlined">hourglass_top</span>
                <p>Loading preview...</p>
              </div>
            </div>
          ) : preview?.error ? (
            <div className="preview-panel">
              <div className="preview-empty">
                <span className="material-symbols-outlined" style={{ color: "var(--error)" }}>error</span>
                <p>{preview.error}</p>
              </div>
            </div>
          ) : (
            <div style={{
              background: "var(--surface-container-lowest)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              maxHeight: "500px",
              overflowY: "auto",
            }}>
              {selectedFile.format === "JSON" && preview ? (
                <pre style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--on-surface)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {JSON.stringify(preview, null, 2)}
                </pre>
              ) : preview?.data ? (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {preview.data[0] && Object.keys(preview.data[0]).map((key: string) => (
                          <th key={key}>{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.data.map((row: any, i: number) => (
                        <tr key={i}>
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j}>{String(val)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--outline)" }}>No content to display</p>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
