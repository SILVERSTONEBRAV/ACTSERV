"use client";
import React from "react";

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card skeleton-card">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${85 - i * 15}%`, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="stat-card skeleton-card">
      <div className="skeleton-line" style={{ width: "60%", height: "12px" }} />
      <div className="skeleton-line" style={{ width: "40%", height: "28px", marginTop: "0.5rem" }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton-line" style={{ width: "80%" }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <div
                    className="skeleton-line"
                    style={{ width: `${60 + Math.random() * 30}%`, animationDelay: `${(r * cols + c) * 0.05}s` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
