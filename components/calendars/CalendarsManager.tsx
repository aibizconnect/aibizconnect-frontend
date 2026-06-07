"use client";

import { useState, useTransition } from "react";
import { createCalendarAction, deleteCalendarAction, listAppointmentsAction } from "@/app/tenants/[tenantId]/calendars/actions";
import type { Calendar, Appointment } from "@/lib/calendars";

export default function CalendarsManager({ tenantId, initial }: { tenantId: string; initial: Calendar[] }) {
  const [cals, setCals] = useState<Calendar[]>(initial);
  const [name, setName] = useState("");
  const [dur, setDur] = useState(30);
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);

  const create = () => start(async () => { const r = await createCalendarAction(tenantId, name || "Discovery Call", dur); if (r.ok) { setName(""); setCals(r.calendars); } });
  const del = (id: string) => { if (confirm("Delete this calendar and its appointments?")) start(async () => setCals((await deleteCalendarAction(tenantId, id)).calendars)); };
  const viewAppts = (id: string) => start(async () => { setOpenId(openId === id ? null : id); if (openId !== id) setAppts(await listAppointmentsAction(tenantId, id)); });

  const fmt = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendars</h1>
          <p className="text-sm text-slate-500">Let people book you. Every booking creates a contact + appointment in your CRM.</p>
        </div>
        <div className="flex items-end gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendar name (e.g. Discovery Call)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
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
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">{c.durationMin} min · Mon–Fri · {c.startHour}:00–{c.endHour}:00</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={link} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-sky-600 hover:bg-slate-50">Booking link ↗</a>
                    <button onClick={() => viewAppts(c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{openId === c.id ? "Hide" : "Appointments"}</button>
                    <button onClick={() => del(c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </div>
                <div className="mt-2 font-mono text-[11px] text-slate-400">{link}</div>
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
