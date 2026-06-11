"use client";

import { useEffect, useState, useTransition } from "react";
import { createCalendarAction, updateCalendarAction, deleteCalendarAction, listAppointmentsAction, getCalendarConnections, getCalendarConnectUrl, connectIcalAction, disconnectProviderAction } from "@/app/tenants/[tenantId]/calendars/actions";
import type { Calendar, Appointment } from "@/lib/calendars";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Curated standard timezones (D-253) — friendly names, GMT offsets shown live. */
const TIMEZONES: { tz: string; label: string }[] = [
  { tz: "America/St_Johns", label: "Newfoundland — St. John's" },
  { tz: "America/Halifax", label: "Atlantic Time — Halifax" },
  { tz: "America/Toronto", label: "Eastern Time — Toronto, New York" },
  { tz: "America/Winnipeg", label: "Central Time — Winnipeg, Chicago" },
  { tz: "America/Edmonton", label: "Mountain Time — Edmonton, Denver" },
  { tz: "America/Phoenix", label: "Arizona — Phoenix (no DST)" },
  { tz: "America/Vancouver", label: "Pacific Time — Vancouver, Los Angeles" },
  { tz: "America/Anchorage", label: "Alaska — Anchorage" },
  { tz: "Pacific/Honolulu", label: "Hawaii — Honolulu" },
  { tz: "America/Mexico_City", label: "Mexico City" },
  { tz: "America/Sao_Paulo", label: "São Paulo" },
  { tz: "UTC", label: "UTC" },
  { tz: "Europe/London", label: "London, Dublin" },
  { tz: "Europe/Paris", label: "Paris, Berlin, Rome, Madrid" },
  { tz: "Europe/Athens", label: "Athens, Helsinki, Kyiv" },
  { tz: "Europe/Istanbul", label: "Istanbul" },
  { tz: "Asia/Dubai", label: "Dubai, Abu Dhabi" },
  { tz: "Asia/Tehran", label: "Tehran" },
  { tz: "Asia/Karachi", label: "Karachi, Islamabad" },
  { tz: "Asia/Kolkata", label: "India — Mumbai, Delhi" },
  { tz: "Asia/Dhaka", label: "Dhaka" },
  { tz: "Asia/Bangkok", label: "Bangkok, Jakarta" },
  { tz: "Asia/Shanghai", label: "China — Beijing, Shanghai" },
  { tz: "Asia/Singapore", label: "Singapore, Kuala Lumpur" },
  { tz: "Asia/Hong_Kong", label: "Hong Kong" },
  { tz: "Asia/Tokyo", label: "Tokyo, Seoul" },
  { tz: "Australia/Perth", label: "Perth" },
  { tz: "Australia/Sydney", label: "Sydney, Melbourne" },
  { tz: "Pacific/Auckland", label: "Auckland" },
];
function gmtOffset(tz: string): string {
  try {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    return p?.value?.replace("GMT", "GMT+0").replace("GMT+0-", "GMT-").replace("GMT+0+", "GMT+") ?? "";
  } catch { return ""; }
}

export default function CalendarsManager({ tenantId, initial }: { tenantId: string; initial: Calendar[] }) {
  const [cals, setCals] = useState<Calendar[]>(initial);
  const [name, setName] = useState("");
  const [dur, setDur] = useState(30);
  const [agent, setAgent] = useState("");
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);

  const create = () => start(async () => { const r = await createCalendarAction(tenantId, { name: name || "Discovery Call", durationMin: dur, assignedToEmail: agent.trim() || undefined }); if (r.ok) { setName(""); setAgent(""); setCals(r.calendars); } });
  const del = async (id: string) => { if (await confirmDialog("Delete this calendar and its appointments?", { danger: true, confirmText: "Delete" })) start(async () => setCals((await deleteCalendarAction(tenantId, id)).calendars)); };
  const viewAppts = (id: string) => start(async () => { setOpenId(openId === id ? null : id); if (openId !== id) setAppts(await listAppointmentsAction(tenantId, id)); });
  const saveCal = (id: string, patch: Parameters<typeof updateCalendarAction>[2]) => start(async () => { const r = await updateCalendarAction(tenantId, id, patch); if (r.ok) setCals(r.calendars); });

  const fmt = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendars</h1>
          <p className="text-sm text-slate-500">Let people book you. Every booking creates a contact + appointment in your CRM.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendar name (e.g. Discovery Call)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="Agent email (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={dur} onChange={(e) => setDur(+e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
          <button onClick={create} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">＋ Create</button>
        </div>
      </div>

      {cals.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No calendars yet. Create one to get a shareable booking link.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {cals.map((c) => {
            const link = `/book/${tenantId}/${c.slug}`;
            return (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{c.name}{c.assignedToEmail && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">{c.assignedToName || c.assignedToEmail}</span>}</div>
                    <div className="text-xs text-slate-500">{c.durationMin} min · {c.weekdays.map((d) => DOW[d]).join(" ")} · {c.startHour}:00–{c.endHour}:00{c.timezone ? ` · ${c.timezone}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={link} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-sky-600 hover:bg-slate-50">Booking link ↗</a>
                    <button onClick={() => setEditId(editId === c.id ? null : c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{editId === c.id ? "Close" : "Edit"}</button>
                    <button onClick={() => viewAppts(c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{openId === c.id ? "Hide" : "Appointments"}</button>
                    <button onClick={() => del(c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
                <div className="mt-2 font-mono text-[11px] text-slate-400">{link}</div>
                {editId === c.id && <CalEditor tenantId={tenantId} cal={c} onSave={(patch) => saveCal(c.id, patch)} pending={pending} />}
                {openId === c.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {appts.length === 0 ? <div className="text-xs text-slate-400">No appointments yet.</div> : (
                      <ul className="space-y-1 text-sm">
                        {appts.map((a) => (
                          <li key={a.id} className="flex justify-between"><span className="text-slate-700">{a.name} · {a.email}</span><span className="text-slate-500">{fmt(a.startAt)}</span></li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalEditor({ tenantId, cal, onSave, pending }: { tenantId: string; cal: Calendar; onSave: (patch: { name?: string; durationMin?: number; bufferMin?: number; weekdays?: number[]; startHour?: number; endHour?: number; timezone?: string; assignedToEmail?: string; assignedToName?: string }) => void; pending: boolean }) {
  const [conns, setConns] = useState<{ googleReady: boolean; microsoftReady: boolean; connections: { id: string; provider: string; accountEmail: string | null; status: string }[] } | null>(null);
  const [busyP, setBusyP] = useState<string | null>(null);
  const [ical, setIcal] = useState("");
  const reloadConns = () => getCalendarConnections(tenantId, cal.id).then(setConns).catch(() => setConns({ googleReady: false, microsoftReady: false, connections: [] }));
  useEffect(() => { reloadConns(); /* eslint-disable-next-line */ }, [tenantId, cal.id]);
  // OAuth finishes in a NEW tab — refresh the list when the user comes back.
  useEffect(() => {
    const on = () => reloadConns();
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
    // eslint-disable-next-line
  }, [tenantId, cal.id]);
  const connectOAuth = async (provider: "google" | "microsoft") => { setBusyP(provider); const r = await getCalendarConnectUrl(tenantId, cal.id, provider); setBusyP(null); if (r.ok && r.url) window.open(r.url, "_blank", "noopener,noreferrer"); else notifyError(r.error || "Could not start connection."); };
  const connectIcal = async () => { setBusyP("ical"); const r = await connectIcalAction(tenantId, cal.id, ical); setBusyP(null); if (r.ok) { setIcal(""); reloadConns(); } else notifyError(r.error || "Could not add iCal feed."); };
  const disc = async (provider: string, connectionId: string) => { setBusyP(connectionId); await disconnectProviderAction(tenantId, cal.id, provider, connectionId); setBusyP(null); reloadConns(); };

  const [name, setName] = useState(cal.name);
  const [agent, setAgent] = useState(cal.assignedToEmail ?? "");
  const [agentName, setAgentName] = useState(cal.assignedToName ?? "");
  const [dur, setDur] = useState(cal.durationMin);
  const [buffer, setBuffer] = useState(cal.bufferMin);
  const [days, setDays] = useState<number[]>(cal.weekdays);
  const [startH, setStartH] = useState(cal.startHour);
  const [endH, setEndH] = useState(cal.endHour);
  const [tz, setTz] = useState(cal.timezone ?? "");
  const toggleDay = (d: number) => setDays((arr) => arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort());

  const inp = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";
  return (
    <div className="mt-3 space-y-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-600">Calendar name<input className={inp} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Agent email<input className={inp} value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="agent@company.com" /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Agent name<input className={inp} value={agentName} onChange={(e) => setAgentName(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Timezone
          <select className={inp} value={tz || "America/Toronto"} onChange={(e) => setTz(e.target.value)}>
            {tz && !TIMEZONES.some((z) => z.tz === tz) && <option value={tz}>{tz} (current)</option>}
            {TIMEZONES.map((z) => <option key={z.tz} value={z.tz}>({gmtOffset(z.tz)}) {z.label}</option>)}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">Available days</div>
        <div className="flex flex-wrap gap-1">
          {DOW.map((d, i) => (
            <button key={i} type="button" onClick={() => toggleDay(i)}
              className={`rounded-md px-2.5 py-1 text-xs ${days.includes(i) ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-600">From<select className={inp} value={startH} onChange={(e) => setStartH(+e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">To<select className={inp} value={endH} onChange={(e) => setEndH(+e.target.value)}>{Array.from({ length: 25 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Slot<select className={inp} value={dur} onChange={(e) => setDur(+e.target.value)}>{[15, 20, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Buffer<select className={inp} value={buffer} onChange={(e) => setBuffer(+e.target.value)}>{[0, 5, 10, 15, 30].map((d) => <option key={d} value={d}>{d} min</option>)}</select></label>
      </div>

      {/* Connect external calendars (free/busy → no conflicts). Several accounts per
          calendar (D-251): business + personal Google, an Outlook, iCal feeds — busy times
          from ALL of them (and all their sub-calendars, D-252) block bookings. */}
      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="text-xs font-medium text-slate-600">Connected calendars (busy times on any of them block bookings)</div>
        {!conns ? <div className="text-xs text-slate-400">Checking…</div> : (
          <div className="space-y-1.5 text-xs">
            {conns.connections.length === 0 && <div className="text-slate-400">Nothing connected yet — bookings only avoid each other.</div>}
            {conns.connections.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1.5">
                <span className="min-w-0 truncate text-slate-700">
                  {c.provider === "google" ? "📅 Google" : c.provider === "microsoft" ? "📨 Outlook" : "🔗 iCal"}
                  <span className="ml-1.5 text-slate-500">{c.accountEmail ?? ""}</span>
                  {c.status !== "connected" && <span className="ml-1.5 text-amber-600">({c.status})</span>}
                </span>
                <button onClick={() => disc(c.provider, c.id)} disabled={busyP === c.id} className="shrink-0 text-red-500 hover:underline disabled:opacity-40">Disconnect</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {conns.googleReady
                ? <button onClick={() => connectOAuth("google")} disabled={busyP === "google"} className="rounded border border-[#1e3a8a] px-2 py-1 font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">＋ Google account</button>
                : <span className="text-slate-400">Google not configured</span>}
              {conns.microsoftReady
                ? <button onClick={() => connectOAuth("microsoft")} disabled={busyP === "microsoft"} className="rounded border border-[#1e3a8a] px-2 py-1 font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">＋ Outlook account</button>
                : <span className="text-slate-400">Outlook not configured</span>}
            </div>
            <div className="flex items-center gap-2">
              <input value={ical} onChange={(e) => setIcal(e.target.value)} placeholder="https://…/calendar.ics (read-only feed)" className="flex-1 rounded border border-slate-300 px-2 py-1" />
              <button onClick={connectIcal} disabled={!ical.trim() || busyP === "ical"} className="rounded border border-[#1e3a8a] px-2 py-1 font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">＋ Add feed</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-3">
        <button onClick={() => onSave({ name, durationMin: dur, bufferMin: buffer, weekdays: days, startHour: startH, endHour: endH, timezone: tz || undefined, assignedToEmail: agent, assignedToName: agentName })} disabled={pending}
          className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">Save</button>
      </div>
    </div>
  );
}
