"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiLogout } from "@/services/api";

export default function Navbar() {
  const r = useRouter();
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/items" className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 px-3 py-1 text-sm">Items</Link>
        <Link href="/admin/settings" className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 px-3 py-1 text-sm">Settings</Link>
      </div>
      <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 rounded-md px-3 py-2" onClick={()=>{ apiLogout().finally(()=>r.push('/login')); }}>Logout</button>
    </div>
  );
}
