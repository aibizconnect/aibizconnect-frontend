"use client";

import { useState } from "react";

/**
 * Listing inquiry → CRM (G4, D-351). Two intents in one card: "Ask a question" and "Book a tour"
 * (date · time · in-person vs video), which is the myRealPage-parity contact surface on a detail
 * page. Both post to the existing public /api/leads/submit with listing context; the tour fields
 * ride along as custom fields so they land in form_submissions and on the CRM contact.
 */
type Mode = "ask" | "tour";

const TIMES = ["Morning (9–12)", "Afternoon (12–5)", "Evening (5–8)"];

export default function ListingInquiry({ tenantId, listingRef, accent, sourceUrl }: {
  tenantId: string; listingRef: string; accent: string; sourceUrl?: string;
}) {
  const [mode, setMode] = useState<Mode>("ask");
  const [v, setV] = useState({ name: "", email: "", phone: "", message: `I'd like more information about ${listingRef}.` });
  const [tour, setTour] = useState({ date: "", time: TIMES[0], kind: "In person" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const set = (k: keyof typeof v, val: string) => setV((p) => ({ ...p, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const isTour = mode === "tour";
    const message = isTour
      ? `${v.message}\n\nRequested tour: ${tour.date || "flexible"} · ${tour.time} · ${tour.kind}`
      : v.message;
    try {
      const r = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId, name: v.name, email: v.email, phone: v.phone, message,
          source: `${isTour ? "IDX tour request" : "IDX listing inquiry"} — ${listingRef}`,
          sourceUrl,
          fields: isTour ? { listing: listingRef, tourDate: tour.date, tourTime: tour.time, tourType: tour.kind } : { listing: listingRef },
        }),
      });
      const j = await r.json();
      setState(j.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
        ✓ Thanks — your {mode === "tour" ? "tour request" : "request"} was sent. The agent will be in touch shortly.
      </div>
    );
  }

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-1 flex gap-1 rounded-lg bg-slate-100 p-1">
        {([["ask", "Ask a question"], ["tour", "Book a tour"]] as [Mode, string][]).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${mode === m ? "bg-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            style={mode === m ? { color: accent } : undefined}>{label}</button>
        ))}
      </div>
      <input required value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" className={inp} />
      <input required type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" className={inp} />
      <input value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone (optional)" className={inp} />
      {mode === "tour" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">Preferred date
            <input type="date" min={today} value={tour.date} onChange={(e) => setTour((p) => ({ ...p, date: e.target.value }))} className={inp} /></label>
          <label className="flex flex-col gap-0.5 text-[11px] text-slate-500">Time of day
            <select value={tour.time} onChange={(e) => setTour((p) => ({ ...p, time: e.target.value }))} className={inp}>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select></label>
          <label className="col-span-2 flex flex-col gap-0.5 text-[11px] text-slate-500">Tour type
            <select value={tour.kind} onChange={(e) => setTour((p) => ({ ...p, kind: e.target.value }))} className={inp}>
              <option>In person</option><option>Video call</option>
            </select></label>
        </div>
      )}
      <textarea value={v.message} onChange={(e) => set("message", e.target.value)} rows={3} className={inp} />
      {state === "error" && <p className="text-xs text-rose-600">Something went wrong — please try again.</p>}
      <button type="submit" disabled={state === "sending"} className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ background: accent }}>
        {state === "sending" ? "Sending…" : mode === "tour" ? "Request tour" : "Request info"}
      </button>
      <p className="text-[10px] leading-snug text-slate-400">By submitting you agree to be contacted about this property. No spam.</p>
    </form>
  );
}
