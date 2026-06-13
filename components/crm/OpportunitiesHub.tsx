"use client";

import { useMemo, useState } from "react";
import CrmPipeline from "./CrmPipeline";
import {
  loadOpportunitiesAction, createPipelineAction, createOppAction, updateOppAction, bulkOppAction, listOppsRichAction,
} from "@/app/tenants/[tenantId]/pipelines/crm-actions";
import type { OpportunityRow, Pipeline } from "@/lib/crm";

/**
 * Opportunities hub (D-307..310) — GHL parity. Board (kanban) ↔ List toggle, inline pipeline
 * switcher (+ create), and a sortable/filterable list with inline stage/status/contact edit and
 * a bulk bar. Status won/lost, link-to-contact. No new columns (works on the current schema).
 */

type ContactLite = { id: string; name: string; email: string };
const STATUSES = ["open", "won", "lost"] as const;
const STATUS_TINT: Record<string, string> = { open: "bg-sky-100 text-sky-700", won: "bg-emerald-100 text-emerald-700", lost: "bg-rose-100 text-rose-700" };
const fmt = (n: number) => (n ? `$${n.toLocaleString()}` : "$0");

export default function OpportunitiesHub({ tenantId, pipelines: initPipelines, pipeline, initialOpps, contacts }: {
  tenantId: string; pipelines: Pipeline[]; pipeline: Pipeline; initialOpps: OpportunityRow[]; contacts: ContactLite[];
}) {
  const [pipelines, setPipelines] = useState<Pipeline[]>(initPipelines);
  const [selectedId, setSelectedId] = useState(pipeline.id);
  const [opps, setOpps] = useState<OpportunityRow[]>(initialOpps);
  const [view, setView] = useState<"board" | "list">("board");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => pipelines.find((p) => p.id === selectedId) ?? pipelines[0], [pipelines, selectedId]);
  const totalValue = useMemo(() => opps.reduce((a, o) => a + o.value, 0), [opps]);

  async function switchPipeline(id: string) {
    setBusy(true);
    try { const r = await loadOpportunitiesAction(tenantId, id); setPipelines(r.pipelines); setSelectedId(r.pipeline.id); setOpps(r.opps); }
    finally { setBusy(false); }
  }
  async function addPipeline() {
    const name = prompt("New pipeline name:");
    if (!name?.trim()) return;
    setBusy(true);
    try { const list = await createPipelineAction(tenantId, name.trim()); setPipelines(list); const created = list[list.length - 1]; if (created) await switchPipeline(created.id); }
    finally { setBusy(false); }
  }
  async function refreshList() { setOpps(await listOppsRichAction(tenantId, selectedId)); }

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Opportunities</h1>
          <p className="text-sm text-slate-500">{opps.length} deals · {fmt(totalValue)} total pipeline value</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline switcher */}
          <select value={selectedId} onChange={(e) => switchPipeline(e.target.value)} disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={addPipeline} disabled={busy} title="New pipeline" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50">＋</button>
          {/* View toggle */}
          <div className="ml-1 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setView("board")} className={`rounded-md px-3 py-1 text-sm font-medium ${view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Board</button>
            <button onClick={() => { setView("list"); void refreshList(); }} className={`rounded-md px-3 py-1 text-sm font-medium ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>List</button>
          </div>
        </div>
      </div>

      {view === "board" ? (
        <CrmPipeline key={selectedId} tenantId={tenantId} pipeline={selected} initial={opps} />
      ) : (
        <OppList tenantId={tenantId} pipeline={selected} opps={opps} contacts={contacts} setOpps={setOpps} onRefresh={refreshList} />
      )}
    </div>
  );
}

function OppList({ tenantId, pipeline, opps, contacts, setOpps, onRefresh }: {
  tenantId: string; pipeline: Pipeline; opps: OpportunityRow[]; contacts: ContactLite[];
  setOpps: (v: OpportunityRow[]) => void; onRefresh: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<{ key: "name" | "value" | "createdAt"; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ name: "", value: "", stage: pipeline.stages[0] ?? "New", contactId: "" });

  const rows = useMemo(() => {
    let r = opps;
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter((o) => o.name.toLowerCase().includes(s) || o.contactName.toLowerCase().includes(s)); }
    if (stageFilter) r = r.filter((o) => o.stage === stageFilter);
    if (statusFilter) r = r.filter((o) => o.status === statusFilter);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sort.key === "value") return (a.value - b.value) * dir;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")) * dir;
    });
  }, [opps, q, stageFilter, statusFilter, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));
  function toggleAll() { setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id))); }
  function toggle(id: string) { setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function patch(id: string, p: Partial<{ stage: string; status: "open" | "won" | "lost"; value: number; contact_id: string | null; name: string }>) {
    setBusy(true); try { setOpps(await updateOppAction(tenantId, pipeline.id, id, p)); } finally { setBusy(false); }
  }
  async function bulk(op: { stage?: string; status?: "open" | "won" | "lost"; delete?: boolean }) {
    if (!sel.size) return;
    if (op.delete && !confirm(`Delete ${sel.size} opportunit${sel.size === 1 ? "y" : "ies"}?`)) return;
    setBusy(true); try { setOpps(await bulkOppAction(tenantId, pipeline.id, [...sel], op)); setSel(new Set()); } finally { setBusy(false); }
  }
  async function create() {
    if (!nf.name.trim()) return;
    setBusy(true);
    try { await createOppAction(tenantId, pipeline.id, { name: nf.name.trim(), value: parseFloat(nf.value) || 0, stage: nf.stage, contactId: nf.contactId || null }); await onRefresh(); setNf({ name: "", value: "", stage: pipeline.stages[0] ?? "New", contactId: "" }); setCreating(false); }
    finally { setBusy(false); }
  }
  const sortBtn = (key: typeof sort.key, label: string) => (
    <button onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))} className="inline-flex items-center gap-1 hover:text-slate-700">
      {label}{sort.key === key && <span className="text-[10px]">{sort.dir === "desc" ? "▼" : "▲"}</span>}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deals / contacts" className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600"><option value="">All stages</option>{pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600"><option value="">All status</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <button onClick={() => setCreating(true)} className="ml-auto rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a]">+ New opportunity</button>
      </div>

      {sel.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#1e3a8a]/20 bg-blue-50 px-3 py-2 text-sm">
          <span className="font-medium text-[#1e3a8a]">{sel.size} selected</span>
          <select onChange={(e) => { if (e.target.value) bulk({ stage: e.target.value }); e.currentTarget.selectedIndex = 0; }} disabled={busy} className="rounded border border-slate-300 px-2 py-1 text-xs"><option value="">Move to stage…</option>{pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <button onClick={() => bulk({ status: "won" })} disabled={busy} className="rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">Mark won</button>
          <button onClick={() => bulk({ status: "lost" })} disabled={busy} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Mark lost</button>
          <button onClick={() => bulk({ delete: true })} disabled={busy} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">Delete</button>
          <button onClick={() => setSel(new Set())} className="text-xs text-slate-500 hover:text-slate-800">Clear</button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-2.5"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" /></th>
              <th className="px-3 py-2.5">{sortBtn("name", "Deal")}</th>
              <th className="px-3 py-2.5">Contact</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">{sortBtn("value", "Value")}</th>
              <th className="px-3 py-2.5">{sortBtn("createdAt", "Created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">No opportunities match.</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id} className={sel.has(o.id) ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                <td className="px-3 py-2"><input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4" /></td>
                <td className="px-3 py-2 font-medium text-slate-900">{o.name}</td>
                <td className="px-3 py-2">
                  <select value={o.contact_id ?? ""} onChange={(e) => patch(o.id, { contact_id: e.target.value || null })} disabled={busy} className="max-w-[150px] truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-600 hover:border-slate-200">
                    <option value="">— none —</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={o.stage} onChange={(e) => patch(o.id, { stage: e.target.value })} disabled={busy} className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-700 hover:border-slate-200">
                    {pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={o.status} onChange={(e) => patch(o.id, { status: e.target.value as any })} disabled={busy} className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[o.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmt(o.value)}</td>
                <td className="px-3 py-2 text-slate-400">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-24" onClick={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-base font-semibold text-slate-900">New opportunity</h2>
            <div className="space-y-3">
              <input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Deal name" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={nf.value} onChange={(e) => setNf({ ...nf, value: e.target.value })} placeholder="Value $" type="number" className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                <select value={nf.stage} onChange={(e) => setNf({ ...nf, stage: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">{pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <select value={nf.contactId} onChange={(e) => setNf({ ...nf, contactId: e.target.value })} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"><option value="">— link a contact (optional) —</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>)}</select>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCreating(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                <button onClick={create} disabled={busy || !nf.name.trim()} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a] disabled:opacity-50">{busy ? "Saving…" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
