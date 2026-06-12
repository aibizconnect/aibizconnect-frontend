"use client";

import { useState } from "react";
import type { Calendar } from "@/lib/calendars";
import CalendarsManager from "./CalendarsManager";
import CalendarView from "./CalendarView";
import AppointmentsTable from "./AppointmentsTable";

/**
 * Calendars area shell (GHL-parity, Blueprint v3.2): tabs mirror GoHighLevel —
 *   Calendar (visual day/week/month grid) | Appointments (filterable list) | Settings
 * (the existing manager: calendar CRUD, availability, connections, booking links).
 * Default tab = Calendar (Copilot-ratified).
 */

// Stable per-calendar color: hash the id into an 8-color palette (CAL-V14).
const CAL_COLORS = ["#1e3a8a", "#0e7490", "#b45309", "#7c3aed", "#be185d", "#15803d", "#b91c1c", "#475569"];
export function calColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CAL_COLORS[h % CAL_COLORS.length];
}

export default function CalendarShell({ tenantId, initial, userEmail }: { tenantId: string; initial: Calendar[]; userEmail?: string | null }) {
  const [tab, setTab] = useState<"calendar" | "appointments" | "settings">("calendar");
  // Settings (CalendarsManager) owns calendar CRUD; the view tabs read this list. A simple
  // remount key refreshes the shell after settings changes when the user switches back.
  const [calendars] = useState<Calendar[]>(initial);

  const tabBtn = (t: typeof tab, label: string) => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        tab === t ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-1 border-b border-slate-200 pb-3">
        {tabBtn("calendar", "Calendar")}
        {tabBtn("appointments", "Appointments")}
        {tabBtn("settings", "Settings")}
      </div>
      {tab === "calendar" && <CalendarView tenantId={tenantId} calendars={calendars} userEmail={userEmail} />}
      {tab === "appointments" && <AppointmentsTable tenantId={tenantId} calendars={calendars} />}
      {tab === "settings" && <CalendarsManager tenantId={tenantId} initial={calendars} />}
    </div>
  );
}
