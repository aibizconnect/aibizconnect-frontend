"use client";

import { useState } from "react";
import { requestPortalLink } from "@/app/portal/[tenantId]/actions";

/** Client Portal sign-in (D-348) — email a magic link, no password. */
export default function PortalLogin({ tenantId, businessName, accent, invalid }: { tenantId: string; businessName: string; accent: string; invalid?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    const r = await requestPortalLink(tenantId, email.trim());
    setBusy(false); setMsg(r.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{businessName}</div>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Client portal</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email and we&apos;ll send you a secure sign-in link.</p>
        {invalid && <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">That link has expired — request a fresh one below.</div>}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]" />
          <button type="submit" disabled={busy} className="w-full rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ background: accent }}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
        </form>
        {msg && <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">{msg}</div>}
      </div>
    </div>
  );
}
