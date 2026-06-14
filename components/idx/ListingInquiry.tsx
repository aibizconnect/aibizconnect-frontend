"use client";

import { useState } from "react";

/** Listing inquiry → CRM (G4, D-351). Posts to the existing /api/leads/submit with listing context. */
export default function ListingInquiry({ tenantId, listingRef, accent }: { tenantId: string; listingRef: string; accent: string }) {
  const [v, setV] = useState({ name: "", email: "", phone: "", message: `I'd like more information about ${listingRef}.` });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const r = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, name: v.name, email: v.email, phone: v.phone, message: v.message, source: `IDX listing inquiry — ${listingRef}` }),
      });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  if (state === "done") return <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">✓ Thanks — your request was sent. The agent will be in touch shortly.</div>;

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">Request more info</div>
      <input required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" className={inp} />
      <input required type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" className={inp} />
      <input value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone (optional)" className={inp} />
      <textarea value={v.message} onChange={(e) => set("message", e.target.value)} rows={3} className={inp} />
      {state === "error" && <p className="text-xs text-rose-600">Something went wrong — please try again.</p>}
      <button type="submit" disabled={state === "sending"} className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: accent }}>{state === "sending" ? "Sending…" : "Request info"}</button>
    </form>
  );
}
