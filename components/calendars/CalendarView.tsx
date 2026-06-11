"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Calendar, CalendarEntry } from "@/lib/calendars";
import {
  listEntriesRangeAction, createManualAppointmentAction, createBlockedTimeAction,
  updateEntryAction, deleteEntryAction,
} from "@/app/tenants/[tenantId]/calendars/actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";
import { calColor } from "./CalendarShell";

/**
 * Visual calendar (GHL-parity, "Calendar Rendering Protocol v1" — custom CSS grid, no
 * external calendar library). Day/Week/Month views, color-coded chips per calendar,
 * gray-hatched blocked time, current-time line, click-a-slot to create, click-a-chip
 * for details (status / reschedule / delete).
 */

const HOUR_H = 48;            // px per hour in day/week grids
const STATUSES = ["booked", "confirmed", "completed", "no_show", "cancelled"] as const;
const STATUS_LABEL: Record<string, string> = { booked: "Booked", confirmed: "Confirmed", completed: "Completed", no_show: "No-show", cancelled: "Cancelled" };

const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekStart = (d: Date) => addDays(dayStart(d), -d.getDay()); // Sunday
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

type View = "day" | "week" | "month";

export default function CalendarView({ tenantId, calendars }: { tenantId: string; calendars: Calendar[] }) {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(dayStart(new Date()));
  const [selected, setSelected] = useState<Set<string>>(new Set(calendars.map((c) => c.id))); // calendar filter
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [, startT] = useTransition();
  const [filterOpen, setFilterOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [modal, setModal] = useState<{ kind: "appointment" | "blocked"; start?: Date } | null>(null);
  const [pop, setPop] = useState<{ entry: CalendarEntry; x: number; y: number } | null>(null);
  const [tick, setTick] = useState(0); // current-time line refresh
  const reloadRef = useRef(0);

  // Visible range per view.
  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
    if (view === "week") { const s = weekStart(anchor); return { from: s, to: addDays(s, 7) }; }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = weekStart(first);
    return { from: gridStart, to: addDays(gridStart, 42) };
  }, [view, anchor]);

  const reload = () => {
    const id = ++reloadRef.current;
    startT(async () => {
      try {
        const rows = await listEntriesRangeAction(tenantId, range.from.toISOString(), range.to.toISOString(), undefined, true);
        if (id === reloadRef.current) setEntries(rows);
      } catch (e: any) { notifyError(e?.message || "Could not load appointments."); }
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [tenantId, range.from.getTime(), range.to.getTime()]);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  const visible = entries.filter((e) => selected.has(e.calendarId) && e.status !== "cancelled");
  const calById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);
  const durMinOf = (e: CalendarEntry) => {
    if (e.endAt) return Math.max(15, (new Date(e.endAt).getTime() - new Date(e.startAt).getTime()) / 60_000);
    return Math.max(15, calById.get(e.calendarId)?.durationMin ?? 30);
  };

  // Grid hour window: union of calendar working hours, padded one hour each side.
  const [gridFrom, gridTo] = useMemo(() => {
    const lo = Math.min(8, ...calendars.map((c) => c.startHour));
    const hi = Math.max(18, ...calendars.map((c) => c.endHour));
    return [Math.max(0, lo - 1), Math.min(24, hi + 1)];
  }, [calendars]);

  const label = view === "day"
    ? anchor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : view === "week"
      ? `${range.from.toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(range.from, 6).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`
      : anchor.toLocaleDateString([], { month: "long", year: "numeric" });

  const nav = (dir: -1 | 1) => setAnchor((a) => view === "day" ? addDays(a, dir) : view === "week" ? addDays(a, 7 * dir) : new Date(a.getFullYear(), a.getMonth() + dir, 1));

  // Click an empty slot → pre-filled new-appointment modal (rounded to 30 min).
  const slotClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = ((e.clientY - rect.top) / HOUR_H) * 60 + gridFrom * 60;
    const rounded = Math.round(mins / 30) * 30;
    const start = new Date(day); start.setHours(0, rounded, 0, 0);
    setModal({ kind: "appointment", start });
  };

  // Lay out a day's chips: overlapping entries share the column width (simple lanes).
  const layoutDay = (day: Date) => {
    const items = visible
      .filter((en) => sameDay(new Date(en.startAt), day))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const lanes: number[] = []; // end-time (ms) per lane
    return items.map((en) => {
      const s = new Date(en.startAt).getTime();
      const eMs = s + durMinOf(en) * 60_000;
      let lane = lanes.findIndex((end) => end <= s);
      if (lane === -1) { lane = lanes.length; lanes.push(eMs); } else lanes[lane] = eMs;
      return { en, lane, lanesAt: () => lanes.length };
    }).map((x, _, arr) => ({ ...x, total: Math.max(...arr.map((y) => y.lane)) + 1 }));
  };

  const chip = (en: CalendarEntry, lane: number, total: number) => {
    const start = new Date(en.startAt);
    const startMin = start.getHours() * 60 + start.getMinutes();
    const top = ((startMin - gridFrom * 60) / 60) * HOUR_H;
    const height = Math.max(20, (durMinOf(en) / 60) * HOUR_H - 2);
    const width = 100 / total;
    const color = calColor(en.calendarId);
    const blocked = en.kind === "blocked";
    // Personal-calendar busy windows (D-242): read-only, no popover — they live in Google/Outlook.
    if (en.kind === "external_busy") {
      return (
        <div
          key={en.id}
          title={en.title ?? "Busy — personal calendar"}
          className="pointer-events-none absolute overflow-hidden rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-left text-[11px] leading-tight text-slate-500"
          style={{
            top, height, left: `${lane * width}%`, width: `calc(${width}% - 2px)`,
            background: "repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 6px, #e2e8f0 6px, #e2e8f0 12px)",
          }}
        >
          <span className="font-semibold">{fmtTime(start)}</span> {en.title ?? "Busy"}
        </div>
      );
    }
    return (
      <button
        key={en.id}
        onClick={(ev) => { ev.stopPropagation(); setPop({ entry: en, x: ev.clientX, y: ev.clientY }); }}
        title={blocked ? (en.title ?? "Blocked") : `${en.title || en.name || "Appointment"} · ${fmtTime(start)}`}
        className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight text-white shadow-sm hover:brightness-110"
        style={{
          top, height, left: `${lane * width}%`, width: `calc(${width}% - 2px)`,
          background: blocked
            ? "repeating-linear-gradient(45deg, #94a3b8, #94a3b8 6px, #cbd5e1 6px, #cbd5e1 12px)" // gray hatched (Copilot-ratified)
            : color,
          opacity: en.status === "completed" ? 0.6 : 1,
        }}
      >
        <span className="font-semibold">{fmtTime(start)}</span>{" "}
        {blocked ? (en.title ?? "Blocked") : (en.title || en.name || "Appointment")}
      </button>
    );
  };

  const timeGrid = (days: Date[]) => {
    const hours = Array.from({ length: gridTo - gridFrom }, (_, i) => gridFrom + i);
    const now = new Date(); void tick;
    const nowTop = ((now.getHours() * 60 + now.getMinutes() - gridFrom * 60) / 60) * HOUR_H;
    return (
      <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          {/* header row */}
          <div className="border-b border-slate-100" />
          {days.map((d, i) => (
            <div key={i} className={`border-b border-l border-slate-100 px-2 py-2 text-center text-xs font-medium ${sameDay(d, now) ? "bg-[#1e3a8a]/5 text-[#1e3a8a]" : "text-slate-600"}`}>
              {d.toLocaleDateString([], { weekday: "short" })} <span className="text-slate-400">{d.getDate()}</span>
            </div>
          ))}
          {/* time gutter */}
          <div className="relative" style={{ height: hours.length * HOUR_H }}>
            {hours.map((h) => (
              <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-400" style={{ top: (h - gridFrom) * HOUR_H }}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
            ))}
          </div>
          {/* day columns */}
          {days.map((d, i) => {
            const laid = layoutDay(d);
            return (
              <div key={i} onClick={(e) => slotClick(d, e)}
                className="relative cursor-pointer border-l border-slate-100"
                style={{ height: (gridTo - gridFrom) * HOUR_H }}>
                {hours.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: (h - gridFrom) * HOUR_H }} />
                ))}
                {laid.map(({ en, lane, total }) => chip(en, lane, total))}
                {sameDay(d, now) && nowTop >= 0 && nowTop <= (gridTo - gridFrom) * HOUR_H && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: nowTop }}>
                    <div className="h-px bg-red-500" />
                    <div className="-mt-[3px] ml-0 h-1.5 w-1.5 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const monthGrid = () => {
    const cells = Array.from({ length: 42 }, (_, i) => addDays(range.from, i));
    const now = new Date();
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-xs font-medium text-slate-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const todays = visible
              .filter((en) => sameDay(new Date(en.startAt), d))
              .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
            return (
              <div key={i}
                onClick={() => { setAnchor(dayStart(d)); setView("day"); }}
                className={`min-h-[96px] cursor-pointer border-b border-l border-slate-100 p-1 align-top hover:bg-slate-50 ${inMonth ? "" : "bg-slate-50/60"}`}>
                <div className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${sameDay(d, now) ? "bg-[#1e3a8a] font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-400"}`}>
                  {d.getDate()}
                </div>
                {todays.slice(0, 3).map((en) => (
                  en.kind === "external_busy" ? (
                    <div key={en.id} className="pointer-events-none mb-0.5 truncate rounded border border-dashed border-slate-300 px-1 text-[10px] leading-4 text-slate-500"
                      style={{ background: "repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 5px,#e2e8f0 5px,#e2e8f0 10px)" }}>
                      {fmtTime(new Date(en.startAt))} {en.title ?? "Busy"}
                    </div>
                  ) : (
                  <div key={en.id}
                    onClick={(ev) => { ev.stopPropagation(); setPop({ entry: en, x: ev.clientX, y: ev.clientY }); }}
                    className="mb-0.5 truncate rounded px-1 text-[10px] leading-4 text-white"
                    style={{ background: en.kind === "blocked" ? "repeating-linear-gradient(45deg,#94a3b8,#94a3b8 5px,#cbd5e1 5px,#cbd5e1 10px)" : calColor(en.calendarId) }}>
                    {fmtTime(new Date(en.startAt))} {en.kind === "blocked" ? (en.title ?? "Blocked") : (en.title || en.name || "Appt")}
                  </div>
                  )
                ))}
                {todays.length > 3 && <div className="text-[10px] text-slate-400">+{todays.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const days = view === "day" ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(range.from, i));

  return (
    <div>
      {/* ── Top bar (GHL layout): filter · Today ‹ › label · view switcher · + New ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <button onClick={() => setFilterOpen((o) => !o)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
            Calendars ({selected.size}/{calendars.length}) ▾
          </button>
          {filterOpen && (
            <div className="absolute z-30 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              {calendars.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(c.id)}
                    onChange={(e) => setSelected((s) => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })} />
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: calColor(c.id) }} />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
              {calendars.length === 0 && <div className="px-2 py-1 text-xs text-slate-400">No calendars yet — create one in Settings.</div>}
            </div>
          )}
        </div>

        <button onClick={() => setAnchor(dayStart(new Date()))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Today</button>
        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white">
          <button onClick={() => nav(-1)} className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50">‹</button>
          <button onClick={() => nav(1)} className="border-l border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50">›</button>
        </div>
        <span className="text-sm font-semibold text-slate-800">{label}</span>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize ${view === v ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{v}</button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setNewOpen((o) => !o)} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1e40af]">＋ New ▾</button>
            {newOpen && (
              <div className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button onClick={() => { setNewOpen(false); setModal({ kind: "appointment" }); }} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50">New appointment</button>
                <button onClick={() => { setNewOpen(false); setModal({ kind: "blocked" }); }} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50">Block time</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {view === "month" ? monthGrid() : timeGrid(days)}

      {/* ── Chip popover: details + status / reschedule / delete ── */}
      {pop && (
        <EntryPopover
          tenantId={tenantId} pop={pop} calName={calById.get(pop.entry.calendarId)?.name ?? "Calendar"}
          onClose={() => setPop(null)} onChanged={() => { setPop(null); reload(); }}
        />
      )}

      {/* ── Modals ── */}
      {modal && (
        <EntryModal
          tenantId={tenantId} calendars={calendars} kind={modal.kind} start={modal.start}
          onClose={() => setModal(null)} onCreated={() => { setModal(null); reload(); }}
        />
      )}
    </div>
  );
}

// ── Popover ──────────────────────────────────────────────────────────────────
function EntryPopover({ tenantId, pop, calName, onClose, onChanged }: {
  tenantId: string; pop: { entry: CalendarEntry; x: number; y: number }; calName: string;
  onClose: () => void; onChanged: () => void;
}) {
  const { entry } = pop;
  const [busy, setBusy] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [start, setStart] = useState(toLocalInput(new Date(entry.startAt)));
  const dur = entry.endAt ? Math.round((+new Date(entry.endAt) - +new Date(entry.startAt)) / 60_000) : 30;
  const [mins, setMins] = useState(dur);
  const left = Math.min(pop.x, typeof window !== "undefined" ? window.innerWidth - 300 : pop.x);
  const top = Math.min(pop.y, typeof window !== "undefined" ? window.innerHeight - 260 : pop.y);

  const setStatus = async (status: string) => {
    setBusy(true);
    const r = await updateEntryAction(tenantId, entry.id, { status });
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not update."); else onChanged();
  };
  const reschedule = async () => {
    setBusy(true);
    const s = new Date(start);
    const patch = { startAt: s.toISOString(), endAt: new Date(s.getTime() + mins * 60_000).toISOString() };
    let r = await updateEntryAction(tenantId, entry.id, patch);
    // Conflict (incl. the connected personal calendar) → warn + explicit override (D-241).
    if (!r.ok && r.conflicts?.length) {
      setBusy(false);
      if (!(await confirmDialog(`${r.error} Reschedule anyway?`, { confirmText: "Reschedule anyway" }))) return;
      setBusy(true);
      r = await updateEntryAction(tenantId, entry.id, { ...patch, force: true });
    }
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not reschedule."); else onChanged();
  };
  const del = async () => {
    if (!(await confirmDialog(entry.kind === "blocked" ? "Remove this blocked time?" : "Delete this appointment?", { danger: true, confirmText: "Delete" }))) return;
    setBusy(true);
    const r = await deleteEntryAction(tenantId, entry.id);
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not delete."); else onChanged();
  };

  const startD = new Date(entry.startAt);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={{ left, top }}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">
              {entry.kind === "blocked" ? (entry.title ?? "Blocked time") : (entry.title || entry.name || "Appointment")}
            </div>
            <div className="text-xs text-slate-500">{calName}</div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="space-y-1 text-xs text-slate-600">
          <div>🕐 {startD.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{entry.endAt ? ` – ${fmtTime(new Date(entry.endAt))}` : ""}</div>
          {entry.kind === "appointment" && entry.name && <div>👤 {entry.name}</div>}
          {entry.kind === "appointment" && entry.email && <div>✉️ {entry.email}</div>}
          {entry.kind === "appointment" && entry.phone && <div>📞 {entry.phone}</div>}
          {entry.notes && <div className="rounded bg-slate-50 p-1.5">{entry.notes}</div>}
        </div>
        {entry.kind === "appointment" && (
          <label className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-600">
            Status
            <select value={entry.status} disabled={busy} onChange={(e) => setStatus(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </label>
        )}
        {reschedOpen ? (
          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-xs" />
            <div className="flex items-center gap-2">
              <select value={mins} onChange={(e) => setMins(+e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs">
                {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
              </select>
              <button onClick={reschedule} disabled={busy} className="ml-auto rounded bg-[#1e3a8a] px-3 py-1 text-xs font-medium text-white disabled:opacity-50">Save</button>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
            <button onClick={() => setReschedOpen(true)} className="text-xs text-[#1e3a8a] hover:underline">Reschedule</button>
            <button onClick={del} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">Delete</button>
          </div>
        )}
      </div>
    </>
  );
}

// ── New appointment / Block time modal ──────────────────────────────────────
function EntryModal({ tenantId, calendars, kind, start, onClose, onCreated }: {
  tenantId: string; calendars: Calendar[]; kind: "appointment" | "blocked"; start?: Date;
  onClose: () => void; onCreated: () => void;
}) {
  const def = start ?? (() => { const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; })();
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [startAt, setStartAt] = useState(toLocalInput(def));
  const [mins, setMins] = useState(kind === "blocked" ? 60 : (calendars[0]?.durationMin ?? 30));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!calendarId) { notifyError("Create a calendar first (Settings tab)."); return; }
    setBusy(true);
    const s = new Date(startAt);
    const endIso = new Date(s.getTime() + mins * 60_000).toISOString();
    if (kind === "blocked") {
      const r = await createBlockedTimeAction(tenantId, { calendarId, startAt: s.toISOString(), endAt: endIso, title: title || undefined });
      setBusy(false);
      if (!r.ok) notifyError(r.error || "Could not save."); else onCreated();
      return;
    }
    const input = { calendarId, title: title || undefined, name: name || undefined, email: email || undefined, phone: phone || undefined, startAt: s.toISOString(), endAt: endIso, notes: notes || undefined };
    let r = await createManualAppointmentAction(tenantId, input);
    // Conflict (incl. the connected personal calendar) → warn + explicit override (D-241).
    if (!r.ok && r.conflicts?.length) {
      setBusy(false);
      if (!(await confirmDialog(`${r.error} Book anyway?`, { confirmText: "Book anyway" }))) return;
      setBusy(true);
      r = await createManualAppointmentAction(tenantId, { ...input, force: true });
    }
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not save."); else onCreated();
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{kind === "blocked" ? "Block time" : "New appointment"}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="space-y-2.5">
          <label className="block text-xs text-slate-600">Calendar
            <select value={calendarId} onChange={(e) => { setCalendarId(e.target.value); const c = calendars.find((x) => x.id === e.target.value); if (kind === "appointment" && c) setMins(c.durationMin); }} className={inp}>
              {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-600">{kind === "blocked" ? "Reason (optional)" : "Title"}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "blocked" ? "Lunch, day off…" : "Buyer consult"} className={inp} />
          </label>
          {kind === "appointment" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">Contact name<input value={name} onChange={(e) => setName(e.target.value)} className={inp} /></label>
                <label className="block text-xs text-slate-600">Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} /></label>
              </div>
              <label className="block text-xs text-slate-600">Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} /></label>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-600">Starts<input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inp} /></label>
            <label className="block text-xs text-slate-600">Duration
              <select value={mins} onChange={(e) => setMins(+e.target.value)} className={inp}>
                {[15, 30, 45, 60, 90, 120, 180, 240, 480].map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} h${m % 60 ? ` ${m % 60} m` : ""}` : `${m} min`}</option>)}
              </select>
            </label>
          </div>
          {kind === "appointment" && (
            <label className="block text-xs text-slate-600">Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} /></label>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">
            {busy ? "Saving…" : kind === "blocked" ? "Block" : "Save appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
