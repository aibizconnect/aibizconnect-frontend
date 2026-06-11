"use client";

import { useState } from "react";
import ContactsList from "./ContactsList";
import TasksRollup from "./TasksRollup";

/** Contacts area shell (GHL-parity): Smart Lists (the list) | Tasks | Companies (stub). */
export default function ContactsShell({ tenantId }: { tenantId: string }) {
  const [tab, setTab] = useState<"contacts" | "tasks" | "companies">("contacts");
  const tabBtn = (t: typeof tab, label: string, soon = false) => (
    <button key={t} onClick={() => !soon && setTab(t)} title={soon ? "Coming soon" : undefined}
      className={`-mb-px border-b-2 pb-2 text-sm font-medium transition ${
        tab === t ? "border-[#1e3a8a] text-[#1e3a8a]" : soon ? "border-transparent text-slate-300" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}>{label}</button>
  );
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contacts</h1>
        <p className="text-sm text-slate-500">Your leads &amp; customers — fed by funnels, forms, bookings and imports.</p>
      </div>
      <div className="mb-4 flex gap-6 border-b border-slate-200">
        {tabBtn("contacts", "Smart Lists")}
        {tabBtn("tasks", "Tasks")}
        {tabBtn("companies", "Companies", true)}
      </div>
      {tab === "contacts" && <ContactsList tenantId={tenantId} />}
      {tab === "tasks" && <TasksRollup tenantId={tenantId} />}
    </div>
  );
}
