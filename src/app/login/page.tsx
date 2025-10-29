"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const r = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await login(username, password);
      r.push("/admin");
    } catch {
      setErr("Invalid credentials");
    }
  }
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-6">
        <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
        <form onSubmit={submit} className="flex flex-col items-start gap-2 w-full">
          <label className="text-slate-300 text-sm">Username</label>
          <input className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100" value={username} onChange={e=>setU(e.target.value)} />
          <label className="text-slate-300 text-sm mt-2">Password</label>
          <input className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-100" type="password" value={password} onChange={e=>setP(e.target.value)} />
          {err && <div className="inline-flex items-center rounded-full border border-red-800 bg-red-900/40 text-red-200 px-2 py-1 text-xs mt-2">{err}</div>}
          <button className="mt-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-md px-3 py-2" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
