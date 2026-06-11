"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { ContactFull, ContactNote, CustomFieldDef, Opportunity } from "@/lib/crm";
import {
  getContactAction, updateContactAction, deleteContactAction, listTagsAction, listCustomFieldsAction,
  listNotesAction, addNoteAction, deleteNoteAction,
  contactAppointmentsAction, contactOpportunitiesAction,
} from "@/app/tenants/[tenantId]/contacts/crm-actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";
import TasksRollup from "./TasksRollup";

/**
 * Contact detail (GHL-parity rebuild — the old scaffold fetched JSON from HTML routes and
 * never worked). Left: editable contact card (core fields + tags + owner + DND + custom
 * fields from tenant_custom_fields, values in contacts.custom). Right: Notes | Tasks |
 * Appointments (matched by email, calendar v1) | Opportunities.
 */
export default function ContactDetailV2({ tenantId, contactId }: { tenantId: string; contactId: string }) {
  const [c, setC] = useState<ContactFull | null>(null);
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [allTags, setAllTags] = useState<{ name: string; color: string }[]>([]);
  const [tab, setTab] = useState<"notes" | "tasks" | "appointments" | "opportunities">("notes");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    getContactAction(tenantId, contactId).then((row) => { if (row) setC(row); else setMissing(true); }).catch(() => setMissing(true));
    listCustomFieldsAction(tenantId).then(setFields).catch(() => {});
    listTagsAction(tenantId).then(setAllTags).catch(() => {});
  }, [tenantId, contactId]);

  if (missing) return <div className="mx-auto max-w-3xl py-16 text-center text-slate-400">Contact not found. <Link href={`/tenants/${tenantId}/contacts`} className="text-[#1e3a8a] hover:underline">Back to contacts</Link></div>;
  if (!c) return <div className="mx-auto max-w-3xl py-16 text-center text-slate-400">Loading…</div>;

  const patch = (p: Partial<ContactFull>) => { setC({ ...c, ...p }); setDirty(true); };
  const save = async () => {
    setBusy(true);
    const r = await updateContactAction(tenantId, c.id, {
      name: c.name, email: c.email, phone: c.phone, source: c.source ?? undefined, score: c.score,
      tags: c.tags, company: c.company ?? undefined, ownerEmail: c.ownerEmail ?? undefined, dnd: c.dnd, custom: c.custom,
    });
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not save."); else setDirty(false);
  };
  const del = async () => {
    if (!(await confirmDialog("Delete this contact? This cannot be undone.", { danger: true, confirmText: "Delete" }))) return;
    await deleteContactAction(tenantId, c.id);
    window.location.href = `/tenants/${tenantId}/contacts`;
  };

  const inp = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm";
  const field = (label: string, node: React.ReactNode) => (
    <label className="block text-xs text-slate-500">{label}<div className="mt-0.5">{node}</div></label>
  );

  const customInput = (f: CustomFieldDef) => {
    const v = (c.custom?.[f.fieldKey] ?? "") as any;
    const set = (val: unknown) => patch({ custom: { ...c.custom, [f.fieldKey]: val } });
    switch (f.fieldType) {
      case "textarea": return <textarea rows={2} value={String(v)} onChange={(e) => set(e.target.value)} className={inp} />;
      case "number": return <input type="number" value={v === "" ? "" : Number(v)} onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))} className={inp} />;
      case "date": return <input type="date" value={String(v)} onChange={(e) => set(e.target.value)} className={inp} />;
      case "checkbox": return <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} className="h-4 w-4" />;
      case "dropdown": return (
        <select value={String(v)} onChange={(e) => set(e.target.value)} className={inp}>
          <option value="">—</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      default: return <input type={f.fieldType === "email" ? "email" : f.fieldType === "phone" ? "tel" : f.fieldType === "url" ? "url" : "text"} value={String(v)} onChange={(e) => set(e.target.value)} className={inp} />;
    }
  };

  const tabBtn = (t: typeof tab, label: string) => (
    <button key={t} onClick={() => setTab(t)}
      className={`-mb-px border-b-2 px-1 pb-2 text-sm font-medium ${tab === t ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/tenants/${tenantId}/contacts`} className="text-sm text-slate-400 hover:text-slate-700">← Contacts</Link>
          <h1 className="text-xl font-semibold text-slate-900">{c.name || c.email || "Contact"}</h1>
          {c.dnd && <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">DND</span>}
        </div>
        <div className="flex items-center gap-2">
          {dirty && <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>}
          <button onClick={del} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Delete</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        {/* ── Left: contact card ── */}
        <div className="space-y-3 self-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {field("Name", <input value={c.name} onChange={(e) => patch({ name: e.target.value })} className={inp} />)}
          {field("Email", <input type="email" value={c.email} onChange={(e) => patch({ email: e.target.value })} className={inp} />)}
          {field("Phone", <input value={c.phone} onChange={(e) => patch({ phone: e.target.value })} className={inp} />)}
          {field("Company", <input value={c.company ?? ""} onChange={(e) => patch({ company: e.target.value })} className={inp} />)}
          {field("Owner (email)", <input value={c.ownerEmail ?? ""} onChange={(e) => patch({ ownerEmail: e.target.value })} className={inp} placeholder="agent@company.com" />)}
          <div className="grid grid-cols-2 gap-2">
            {field("Score", <input type="number" value={c.score} onChange={(e) => patch({ score: +e.target.value || 0 })} className={inp} />)}
            {field("Source", <input value={c.source ?? ""} onChange={(e) => patch({ source: e.target.value })} className={inp} />)}
          </div>
          <label className="flex items-center justify-between text-xs text-slate-500">
            Do not disturb
            <input type="checkbox" checked={c.dnd} onChange={(e) => patch({ dnd: e.target.checked })} className="h-4 w-4" />
          </label>
          <div>
            <div className="mb-1 text-xs text-slate-500">Tags</div>
            <div className="flex flex-wrap gap-1">
              {allTags.map((t) => (
                <button key={t.name} onClick={() => patch({ tags: c.tags.includes(t.name) ? c.tags.filter((x) => x !== t.name) : [...c.tags, t.name] })}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${c.tags.includes(t.name) ? "text-white" : "text-slate-600 ring-1 ring-slate-200"}`}
                  style={c.tags.includes(t.name) ? { background: t.color } : {}}>{t.name}</button>
              ))}
              {c.tags.filter((t) => !allTags.some((a) => a.name === t)).map((t) => (
                <button key={t} onClick={() => patch({ tags: c.tags.filter((x) => x !== t) })} title="Remove"
                  className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] text-white">{t} ✕</button>
              ))}
              {allTags.length === 0 && c.tags.length === 0 && <span className="text-xs text-slate-400">No tags.</span>}
            </div>
          </div>
          {fields.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Custom fields</div>
              {fields.map((f) => <div key={f.id}>{field(f.name, customInput(f))}</div>)}
            </div>
          )}
          {c.createdAt && <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">Created {new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</div>}
        </div>

        {/* ── Right: activity tabs ── */}
        <div className="min-w-0">
          <div className="mb-3 flex gap-5 border-b border-slate-200">
            {tabBtn("notes", "Notes")}
            {tabBtn("tasks", "Tasks")}
            {tabBtn("appointments", "Appointments")}
            {tabBtn("opportunities", "Opportunities")}
          </div>
          {tab === "notes" && <NotesPanel tenantId={tenantId} contactId={contactId} />}
          {tab === "tasks" && <TasksRollup tenantId={tenantId} contactId={contactId} compact />}
          {tab === "appointments" && <AppointmentsPanel tenantId={tenantId} email={c.email} />}
          {tab === "opportunities" && <OpportunitiesPanel tenantId={tenantId} contactId={contactId} />}
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ tenantId, contactId }: { tenantId: string; contactId: string }) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [body, setBody] = useState("");
  const [, startT] = useTransition();
  const reload = () => startT(async () => setNotes(await listNotesAction(tenantId, contactId)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [tenantId, contactId]);
  const add = async () => {
    if (!body.trim()) return;
    const r = await addNoteAction(tenantId, contactId, body);
    if (!r.ok) { notifyError(r.error || "Could not add note."); return; }
    setBody(""); reload();
  };
  return (
    <div>
      <div className="mb-3 flex gap-2">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a note…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={add} className="self-end rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Add</button>
      </div>
      {notes.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">No notes yet.</div> : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-xl border border-slate-200 bg-white p-3">
              <div className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>{new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{n.authorEmail ? ` · ${n.authorEmail}` : ""}</span>
                <button onClick={async () => { await deleteNoteAction(tenantId, n.id); reload(); }} className="opacity-0 transition group-hover:opacity-100 hover:text-red-500">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppointmentsPanel({ tenantId, email }: { tenantId: string; email: string }) {
  const [appts, setAppts] = useState<{ id: string; title: string | null; startAt: string; endAt: string | null; status: string }[]>([]);
  useEffect(() => { contactAppointmentsAction(tenantId, email).then(setAppts).catch(() => {}); }, [tenantId, email]);
  if (!email) return <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">Add an email to match this contact&apos;s appointments.</div>;
  if (appts.length === 0) return <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">No appointments for {email}.</div>;
  return (
    <ul className="divide-y divide-slate-50 rounded-xl border border-slate-200 bg-white">
      {appts.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-0 truncate font-medium text-slate-800">{a.title || "Appointment"}</span>
          <span className="whitespace-nowrap text-xs text-slate-500">
            {new Date(a.startAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.status === "cancelled" ? "bg-red-50 text-red-600" : a.status === "completed" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{a.status}</span>
        </li>
      ))}
    </ul>
  );
}

function OpportunitiesPanel({ tenantId, contactId }: { tenantId: string; contactId: string }) {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  useEffect(() => { contactOpportunitiesAction(tenantId, contactId).then(setOpps).catch(() => {}); }, [tenantId, contactId]);
  if (opps.length === 0) return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
      No opportunities linked. <Link href={`/tenants/${tenantId}/pipelines`} className="text-[#1e3a8a] hover:underline">Open pipelines ↗</Link>
    </div>
  );
  return (
    <ul className="divide-y divide-slate-50 rounded-xl border border-slate-200 bg-white">
      {opps.map((o) => (
        <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className="min-w-0 truncate font-medium text-slate-800">{o.name}</span>
          <span className="text-xs text-slate-500">{o.stage}</span>
          <span className="text-xs font-medium text-slate-700">${o.value.toLocaleString()}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${o.status === "won" ? "bg-emerald-50 text-emerald-700" : o.status === "lost" ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-700"}`}>{o.status}</span>
        </li>
      ))}
    </ul>
  );
}
