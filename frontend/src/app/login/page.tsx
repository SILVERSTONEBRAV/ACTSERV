"use client";
import React, { useState } from "react";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, email, password);
        // Auto-login after register
        await login(username, password);
      } else {
        await login(username, password);
      }
      window.location.href = "/";
    } catch (err: any) {
      setError(isRegister ? "Registration failed. Username may be taken." : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 style={{ fontWeight: 800, letterSpacing: "0.05em" }}>ACTSERV</h1>
        <p>{isRegister ? "Create your operator account" : "Sign in to the control plane"}</p>

        {error && (
          <div style={{ background: "rgba(255,180,171,0.15)", color: "var(--error)", padding: "0.75rem", borderRadius: "0.375rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="input-label">Username</label>
            <input className="input-field" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
          </div>
          {isRegister && (
            <div>
              <label className="input-label">Email</label>
              <input className="input-field" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" required />
            </div>
          )}
          <div>
            <label className="input-label">Password</label>
            <input className="input-field" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            style={{ background: "none", border: "none", color: "var(--tertiary)", cursor: "pointer", fontSize: "0.85rem" }}
          >
            {isRegister ? "Already have an account? Sign In" : "Need an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
