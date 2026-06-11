"use client";

import { useState } from "react";

type Day = { date: string; slots: string[] };
type VenueOpt = { kind: string; label: string; detail: string };

const VENUE_ICON: Record<string, string> = { zoom: "🎥", teams: "🟦", meet: "📹", phone: "📞", in_person: "📍", custom: "🔗" };

/** Public booking widget: pick a day + slot (+ how to meet, + guests), enter details, book.
 *  Brand-themed (navy). */
export default function BookingWidget({ tenantId, calendarId, calendarName, durationMin, days, venues = [] }: { tenantId: string; calendarId: string; calendarName: string; durationMin: number; days: Day[]; venues?: VenueOpt[] }) {
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [venueIdx, setVenueIdx] = useState<number | null>(venues.length === 1 ? 0 : null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", guests: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const day = days[dayIdx];
  const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  async function book() {
    if (!slot) return;
    if (venues.length > 0 && venueIdx == null) { setState("error"); setErr("Please choose how you'd like to meet."); return; }
    const invitees = form.guests.split(/[,;\s]+/).map((e) => e.trim()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)).slice(0, 5);
    setState("sending"); setErr(null);
    try {
      const r = await fetch("/api/book", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, calendarId, name: form.name, email: form.email, phone: form.phone, startAt: slot, ...(venueIdx != null ? { venueIdx } : {}), ...(invitees.length ? { invitees } : {}) }) });
      const j = await r.json();
      if (j.ok) setState("done"); else { setState("error"); setErr(j.error ?? "Could not book."); }
    } catch { setState("error"); setErr("Network error."); }
  }

  if (state === "done") {
    const v = venueIdx != null ? venues[venueIdx] : null;
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <h2 className="text-2xl font-semibold">🎉 You&apos;re booked!</h2>
        <p className="mt-2 text-slate-300">{calendarName} · {slot && new Date(slot).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        {v && <p className="mt-1 text-slate-300">{VENUE_ICON[v.kind] ?? "🔗"} {v.label}{v.detail ? ` — ${v.detail}` : ""}</p>}
        <p className="mt-2 text-sm text-slate-400">We&apos;ll see you then. A confirmation will follow.</p>
      </div>
    );
  }

  if (days.length === 0) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">No times available right now. Please check back soon.</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          {days.slice(0, 10).map((d, i) => (
            <button key={d.date} onClick={() => { setDayIdx(i); setSlot(null); }} className={`rounded-lg border px-3 py-2 text-sm transition ${i === dayIdx ? "border-[#22d3ee] bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>{fmtDay(d.date)}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {day?.slots.map((s) => (
            <button key={s} onClick={() => setSlot(s)} className={`rounded-lg border px-2 py-2 text-sm transition ${slot === s ? "border-[#22d3ee] bg-[#2563eb] text-white" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>{fmtTime(s)}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Times shown in your local time{typeof Intl !== "undefined" ? ` (${Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")})` : ""}.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h3 className="font-medium">Your details</h3>
        <p className="mb-3 text-xs text-slate-400">{durationMin}-minute {calendarName}{slot ? ` · ${new Date(slot).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}</p>
        {venues.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-xs text-slate-400">How would you like to meet?</div>
            <div className="flex flex-wrap gap-1.5">
              {venues.map((v, i) => (
                <button key={i} type="button" onClick={() => setVenueIdx(i)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${venueIdx === i ? "border-[#22d3ee] bg-[#2563eb] text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>
                  {VENUE_ICON[v.kind] ?? "🔗"} {v.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
          <input value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} placeholder="Invite others — emails, comma-separated (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
        <button onClick={book} disabled={!slot || !form.name || !form.email || state === "sending"} className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
          {state === "sending" ? "Booking…" : slot ? "Confirm booking" : "Pick a time"}
        </button>
      </div>
    </div>
  );
}
