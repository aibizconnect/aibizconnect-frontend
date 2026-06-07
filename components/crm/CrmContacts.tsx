"use client";

import { useState, useTransition } from "react";
import { createContactAction, deleteContactAction } from "@/app/tenants/[tenantId]/contacts/crm-actions";
import type { Contact } from "@/lib/crm";

const TABS = ["Smart Lists", "Bulk Actions", "Tasks", "Companies"];

export default function CrmContacts({ tenantId, initial }: { tenantId: string; initial: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initial);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  const filtered = contacts.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  const add = () => start(async () => { const r = await createContactAction(tenantId, form); if (r.ok) { setForm({ name: "", email: "", phone: "" }); setAdding(false); setContacts(r.contacts); } });
  const del = (id: string) => start(async () => setContacts((await deleteContactAction(tenantId, id)).contacts));

  const scoreColor = (s: number) => s >= 50 ? "bg-emerald-100 text-emerald-700" : s >= 20 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">Your leads &amp; customers — fed by funnels, forms, and the onboarding wizard.</p>
        </div>
        <button onClick={() => setAdding((v) => !v)} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">＋ Add contact</button>
      </div>

      <div className="mb-4 flex gap-6 border-b border-slate-200 text-sm">
        <span className="-mb-px border-b-2 border-[#1e3a8a] pb-2 font-medium text-[#1e3a8a]">Smart Lists</span>
        {TABS.slice(1).map((t) => <span key={t} className="pb-2 text-slate-400" title="Coming soon">{t}</span>)}
      </div>

      {adding && (
        <div className="mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded border border-slate-300 px-2 py-1.5 text-sm" />
          <button onClick={add} disabled={pending} className="rounded bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Save</button>
        </div>
      )}

      <div className="mb-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts…" className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Source</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No contacts yet. Add one, or they&apos;ll arrive from your funnels &amp; forms.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${scoreColor(c.score)}`}>{c.score}</span></td>
                <td className="px-4 py-3 text-slate-500">{c.source ?? "—"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => del(c.id)} className="text-xs text-red-500 hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
