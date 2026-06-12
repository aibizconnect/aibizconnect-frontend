"use client";

import { useState } from "react";
import ContactsList from "./ContactsList";
import TasksRollup from "./TasksRollup";
import RestoreTab from "./RestoreTab";
import BulkActionsLog from "./BulkActionsLog";
import CompaniesTab from "./CompaniesTab";
import GoogleSyncTab from "./GoogleSyncTab";

/**
 * Contacts area shell (GHL-parity, D-230 + sweep D-232..D-236) — the full GHL tab set:
 * Smart Lists (the list) | Bulk Actions (audit log) | Restore (soft-deleted) | Tasks | Companies,
 * plus Google Sync (D-258: group-scoped import, labels → tags).
 */
export default function ContactsShell({ tenantId }: { tenantId: string }) {
  const [tab, setTab] = useState<"contacts" | "bulk" | "restore" | "tasks" | "companies" | "gsync">("contacts");
  // Companies → click-through opens the list pre-filtered to that company.
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);

  const tabBtn = (t: typeof tab, label: string) => (
    <button key={t} onClick={() => { setTab(t); if (t !== "contacts") setCompanyFilter(null); }}
      className={`-mb-px border-b-2 pb-2 text-sm font-medium transition ${
        tab === t ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-800"
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
        {tabBtn("bulk", "Bulk Actions")}
        {tabBtn("restore", "Restore")}
        {tabBtn("tasks", "Tasks")}
        {tabBtn("companies", "Companies")}
        {tabBtn("gsync", "Google Sync")}
      </div>
      {tab === "contacts" && <ContactsList tenantId={tenantId} companyFilter={companyFilter} onClearCompany={() => setCompanyFilter(null)} />}
      {tab === "bulk" && <BulkActionsLog tenantId={tenantId} />}
      {tab === "restore" && <RestoreTab tenantId={tenantId} />}
      {tab === "tasks" && <TasksRollup tenantId={tenantId} />}
      {tab === "companies" && <CompaniesTab tenantId={tenantId} onOpen={(name) => { setCompanyFilter(name); setTab("contacts"); }} />}
      {tab === "gsync" && <GoogleSyncTab tenantId={tenantId} />}
    </div>
  );
}
