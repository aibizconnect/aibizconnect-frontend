"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Calendar, CalendarEntry } from "@/lib/calendars";
import { listEntriesRangeAction, updateEntryAction, deleteEntryAction } from "@/app/tenants/[tenantId]/calendars/actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";
import { calColor } from "./CalendarShell";

/**
 * Appointments list (GHL-parity): filterable table — date range, calendar, status —
 * with inline status changes and delete. Blocked time shows with a gray "Blocked" badge.
 */

const STATUSES = ["booked", "confirmed", "completed", "no_show", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = { booked: "Booked", confirmed: "Confirmed", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };
const STATUS_TONE: Record<string, string> = {
  booked: "bg-sky-50 text-sky-700", confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600", no_show: "bg-amber-50 text-amber-700", cancelled: "bg-red-50 text-red-600",
};

const toDateInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function AppointmentsTable({ tenantId, calendars }: { tenantId: string; calendars: Calendar[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [from, setFrom] = useState(toDateInput(new Date(today.getTime() - 7 * 86400_000)));
  const [to, setTo] = useState(toDateInput(new Date(today.getTime() + 30 * 86400_000)));
  const [calId, setCalId] = useState<string>("");      // "" = all
  const [status, setStatus] = useState<string>("");    // "" = all
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [pending, startT] = useTransition();
  const reloadRef = useRef(0);

  const calById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  const reload = () => {
    const id = ++reloadRef.current;
    startT(async () => {
      try {
        const fromISO = new Date(`${from}T00:00:00`).toISOString();
        const toISO = new Date(new Date(`${to}T00:00:00`).getTime() + 86400_000).toISOString();
        const rows = await listEntriesRangeAction(tenantId, fromISO, toISO, calId ? [calId] : undefined);
        if (id === reloadRef.current) setEntries(rows);
      } catch (e: any) { notifyError(e?.message || "Could not load appointments."); }
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [tenantId, from, to, calId]);

  const visible = entries.filter((e) => !status || e.status === status);

  const setEntryStatus = async (id: string, s: string) => {
    const r = await updateEntryAction(tenantId, id, { status: s });
    if (!r.ok) notifyError(r.error || "Could not update."); else reload();
  };
  const del = async (e: CalendarEntry) => {
    if (!(await confirmDialog(e.kind === "blocked" ? "Remove this blocked time?" : "Delete this appointment?", { danger: true, confirmText: "Delete" }))) return;
    const r = await deleteEntryAction(tenantId, e.id);
    if (!r.ok) notifyError(r.error || "Could not delete."); else reload();
  };

  const fmtRange = (e: CalendarEntry) => {
    const s = new Date(e.startAt);
    const base = s.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    return e.endAt ? `${base} – ${new Date(e.endAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : base;
  };

  const inp = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm";
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-600">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} /></label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Calendar
          <select value={calId} onChange={(e) => setCalId(e.target.value)} className={inp}>
            <option value="">All calendars</option>
            {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-600">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </label>
        {pending && <span className="pb-2 text-xs text-slate-400">Loading…</span>}
        <span className="ml-auto pb-2 text-xs text-slate-400">{visible.length} {visible.length === 1 ? "entry" : "entries"}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 font-medium">Title / Contact</th>
              <th className="px-3 py-2.5 font-medium">Calendar</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-400">No appointments in this range.</td></tr>
            )}
            {visible.map((e) => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{fmtRange(e)}</td>
                <td className="px-3 py-2.5">
                  {e.kind === "blocked" ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">⛔ {e.title ?? "Blocked"}</span>
                  ) : (
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-800">{e.title || e.name || "Appointment"}</div>
                      {(e.name || e.email) && <div className="truncate text-xs text-slate-500">{[e.name, e.email, e.phone].filter(Boolean).join(" · ")}</div>}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full" style={{ background: calColor(e.calendarId) }} />
                    {calById.get(e.calendarId)?.name ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {e.kind === "blocked" ? (
                    <span className="rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500">Blocked</span>
                  ) : (
                    <select value={e.status} onChange={(ev) => setEntryStatus(e.id, ev.target.value)}
                      className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${STATUS_TONE[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => del(e)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
