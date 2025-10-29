"use client";
import { useState } from "react";
import { apiIngest, apiLogout } from "@/services/api";

export default function AdminSettingsPage() {
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState("");

  async function ingest() {
    setMessage("");
    setIngesting(true);
    try {
      const res = await apiIngest();
      setMessage(`Ingest complete. Inserted: ${res.inserted ?? 0}`);
    } catch (e) {
      setMessage("Ingest failed");
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="container">
      <h1>Settings</h1>
      <div className="card row">
        <div className="row" style={{gap:12}}>
          <button className="btn" disabled={ingesting} onClick={ingest}>{ingesting ? 'Ingesting…' : 'Ingest CSV'}</button>
          <button className="btn secondary" onClick={()=>{ apiLogout().finally(()=>location.href='/login'); }}>Logout</button>
        </div>
        {message && <div className="label" style={{marginTop:8}}>{message}</div>}
      </div>
    </div>
  );
}
