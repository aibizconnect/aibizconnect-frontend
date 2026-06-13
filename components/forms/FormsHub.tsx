"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listFormsAction, getFormAction, newFormAction, saveFormAction, deleteFormAction, submissionsAction,
} from "@/app/tenants/[tenantId]/sites/forms/actions";
import type { FormDef, FormField, FieldType, Submission } from "@/lib/server/forms";

/**
 * Forms hub (D-314/315) — list, single-page builder, submissions viewer, share/embed. Surveys
 * are a "soon" tab. Submissions flow through the existing /api/leads/submit pipeline.
 */

const FIELD_TYPES: FieldType[] = ["text", "email", "phone", "textarea", "number", "date", "select", "radio", "checkbox"];
const STATUS_TINT: Record<string, string> = { draft: "bg-slate-100 text-slate-600", published: "bg-emerald-100 text-emerald-700", archived: "bg-slate-200 text-slate-500" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";

export default function FormsHub({ tenantId, initial }: { tenantId: string; initial: FormDef[] }) {
  const [tab, setTab] = useState<"forms" | "surveys">("forms");
  const [forms, setForms] = useState<FormDef[]>(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FormDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  async function newForm() {
    setBusy(true);
    try { const r = await newFormAction(tenantId); setForms(r.forms); if (r.id) setEditing(r.id); } finally { setBusy(false); }
  }
  async function refresh() { setForms(await listFormsAction(tenantId)); }
  function shareUrl(id: string) { return `${origin}/f/${id}`; }
  async function copy(text: string, label: string) { try { await navigator.clipboard.writeText(text); alert(`${label} copied to clipboard.`); } catch { /* */ } }

  return (
    <div>
      <div className="mb-4 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Forms</h1>
          <p className="text-sm text-slate-500">Capture leads with shareable forms — every submission lands in Contacts.</p>
        </div>
        {tab === "forms" && <button onClick={newForm} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a] disabled:opacity-50">+ New form</button>}
      </div>

      <div className="mb-5 flex gap-5 border-b border-slate-200 text-sm">
        <button onClick={() => setTab("forms")} className={`-mb-px border-b-2 px-1 pb-2 font-medium ${tab === "forms" ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500"}`}>Forms</button>
        <span className="-mb-px flex items-center gap-1 border-b-2 border-transparent px-1 pb-2 font-medium text-slate-400">Surveys<span className="rounded bg-slate-100 px-1 text-[9px] uppercase">soon</span></span>
      </div>

      {tab === "surveys" ? null : forms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-6 py-16 text-center text-sm text-slate-400">
          No forms yet. Create one to start capturing leads — share the link or embed it on any page.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">{f.name}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{f.fields.length} fields · {f.submissionCount ?? 0} submission{(f.submissionCount ?? 0) === 1 ? "" : "s"}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[f.status]}`}>{f.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                <button onClick={() => setEditing(f.id)} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Edit</button>
                <button onClick={() => setViewing(f)} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Submissions</button>
                <button onClick={() => copy(shareUrl(f.id), "Share link")} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Copy link</button>
                <button onClick={() => copy(`<iframe src="${shareUrl(f.id)}" width="100%" height="700" frameborder="0"></iframe>`, "Embed code")} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Embed</button>
                <a href={shareUrl(f.id)} target="_blank" rel="noreferrer" className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50">Open ↗</a>
                <button onClick={async () => { if (confirm(`Delete ${f.name}?`)) setForms(await deleteFormAction(tenantId, f.id)); }} className="rounded border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <FormBuilder tenantId={tenantId} formId={editing} onClose={() => { setEditing(null); void refresh(); }} onSaved={(list) => setForms(list)} />}
      {viewing && <SubmissionsModal tenantId={tenantId} form={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function FormBuilder({ tenantId, formId, onClose, onSaved }: { tenantId: string; formId: string; onClose: () => void; onSaved: (list: FormDef[]) => void }) {
  const [form, setForm] = useState<FormDef | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getFormAction(tenantId, formId).then(setForm).catch(() => {}); }, [tenantId, formId]);

  function patchField(i: number, p: Partial<FormField>) { setForm((f) => f ? { ...f, fields: f.fields.map((x, idx) => idx === i ? { ...x, ...p } : x) } : f); }
  function addField() { setForm((f) => f ? { ...f, fields: [...f.fields, { key: `field_${f.fields.length + 1}`, label: "New field", type: "text", required: false, order: f.fields.length }] } : f); }
  function removeField(i: number) { setForm((f) => f ? { ...f, fields: f.fields.filter((_, idx) => idx !== i) } : f); }
  function moveField(i: number, dir: -1 | 1) {
    setForm((f) => { if (!f) return f; const a = [...f.fields]; const j = i + dir; if (j < 0 || j >= a.length) return f; [a[i], a[j]] = [a[j], a[i]]; return { ...f, fields: a }; });
  }
  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const fields = form.fields.map((f, i) => ({ ...f, key: f.key && f.key.startsWith("field_") ? slug(f.label) : (f.key || slug(f.label)), order: i }));
      const list = await saveFormAction(tenantId, formId, { name: form.name, fields, settings: form.settings, status: form.status });
      onSaved(list); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal title="Edit form" onClose={onClose} wide>
      {!form ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Form name" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="rounded-md border border-slate-300 px-2 py-2 text-sm">
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </div>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Fields</div>
            <div className="divide-y divide-slate-100">
              {form.fields.map((f, i) => (
                <div key={i} className="space-y-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <input value={f.label} onChange={(e) => patchField(i, { label: e.target.value })} placeholder="Field label" className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" />
                    <select value={f.type} onChange={(e) => patchField(i, { type: e.target.value as FieldType })} className="rounded border border-slate-200 px-2 py-1 text-sm">
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-slate-500"><input type="checkbox" checked={f.required} onChange={(e) => patchField(i, { required: e.target.checked })} />req</label>
                    <button onClick={() => moveField(i, -1)} className="px-1 text-slate-400 hover:text-slate-700">↑</button>
                    <button onClick={() => moveField(i, 1)} className="px-1 text-slate-400 hover:text-slate-700">↓</button>
                    <button onClick={() => removeField(i)} className="px-1 text-slate-400 hover:text-rose-600">✕</button>
                  </div>
                  {(f.type === "select" || f.type === "radio") && (
                    <input value={(f.options ?? []).join(", ")} onChange={(e) => patchField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Options, comma-separated" className="w-full rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs" />
                  )}
                </div>
              ))}
            </div>
            <button onClick={addField} className="px-3 py-2 text-xs font-medium text-[#1e3a8a] hover:underline">+ Add field</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><span className="mb-1 block text-xs text-slate-500">Submit button text</span><input value={form.settings.submitButtonText} onChange={(e) => setForm({ ...form, settings: { ...form.settings, submitButtonText: e.target.value } })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <label className="text-sm"><span className="mb-1 block text-xs text-slate-500">Redirect URL (optional)</span><input value={form.settings.redirectUrl ?? ""} onChange={(e) => setForm({ ...form, settings: { ...form.settings, redirectUrl: e.target.value || null } })} placeholder="https://…" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
          </div>
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Thank-you message</span><input value={form.settings.thankYouMessage} onChange={(e) => setForm({ ...form, settings: { ...form.settings, thankYouMessage: e.target.value } })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            <button onClick={save} disabled={saving} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a] disabled:opacity-50">{saving ? "Saving…" : "Save form"}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function SubmissionsModal({ tenantId, form, onClose }: { tenantId: string; form: FormDef; onClose: () => void }) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  useEffect(() => { submissionsAction(tenantId, form.id).then(setSubs).catch(() => setSubs([])); }, [tenantId, form.id]);
  const cols = useMemo(() => {
    const set = new Set<string>();
    (subs ?? []).forEach((s) => Object.keys(s.data).forEach((k) => set.add(k)));
    return Array.from(set).slice(0, 8);
  }, [subs]);

  return (
    <Modal title={`Submissions · ${form.name}`} onClose={onClose} wide>
      {!subs ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : subs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400">No submissions yet. Share the form link to start collecting.</p>
      ) : (
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">When</th>{cols.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">{new Date(s.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  {cols.map((c) => <td key={c} className="max-w-[200px] truncate px-3 py-2 text-slate-700" title={s.data[c]}>{s.data[c] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-12" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-white p-5 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
