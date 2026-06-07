"use client";

import { useEffect, useState, useTransition } from "react";
import { createCalendarAction, updateCalendarAction, deleteCalendarAction, listAppointmentsAction, getGoogleConnectUrl, getGoogleStatus, disconnectGoogleAction } from "@/app/tenants/[tenantId]/calendars/actions";
import type { Calendar, Appointment } from "@/lib/calendars";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const del = (id: string) => { if (confirm("Delete this calendar and its appointments?")) start(async () => setCals((await deleteCalendarAction(tenantId, id)).calendars)); };
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
  const [gcal, setGcal] = useState<{ ready: boolean; connected: boolean; accountEmail: string | null } | null>(null);
  const [gbusy, setGbusy] = useState(false);
  useEffect(() => { getGoogleStatus(tenantId, cal.id).then(setGcal).catch(() => setGcal({ ready: false, connected: false, accountEmail: null })); }, [tenantId, cal.id]);
  const connectGoogle = async () => {
    setGbusy(true);
    const r = await getGoogleConnectUrl(tenantId, cal.id);
    setGbusy(false);
    if (r.ok && r.url) { window.open(r.url, "_blank", "noopener,noreferrer"); }
    else alert(r.error || "Could not start Google connection.");
  };
  const disconnectGoogle = async () => { setGbusy(true); await disconnectGoogleAction(tenantId, cal.id); setGbusy(false); setGcal((s) => s ? { ...s, connected: false, accountEmail: null } : s); };

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
        <label className="flex flex-col gap-1 text-xs text-slate-600">Timezone (IANA)<input className={inp} value={tz} onChange={(e) => setTz(e.target.value)} placeholder="America/Toronto" /></label>
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="text-xs">
          {!gcal ? <span className="text-slate-400">Checking Google…</span>
            : gcal.connected ? (
              <span className="text-emerald-700">✓ Google Calendar connected{gcal.accountEmail ? ` (${gcal.accountEmail})` : ""} — busy times block bookings. <button onClick={disconnectGoogle} disabled={gbusy} className="ml-1 text-red-500 hover:underline disabled:opacity-40">Disconnect</button></span>
            ) : gcal.ready ? (
              <button onClick={connectGoogle} disabled={gbusy} className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">{gbusy ? "…" : "🔗 Connect Google Calendar"}</button>
            ) : <span className="text-slate-400" title="A platform admin must add the Google Calendar app credentials in Platform → Connected apps.">Google Calendar not configured yet</span>}
        </div>
        <button onClick={() => onSave({ name, durationMin: dur, bufferMin: buffer, weekdays: days, startHour: startH, endHour: endH, timezone: tz || undefined, assignedToEmail: agent, assignedToName: agentName })} disabled={pending}
          className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">Save</button>
      </div>
    </div>
  );
}
