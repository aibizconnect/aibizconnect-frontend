"use client";

import { useEffect, useMemo, useState } from "react";
import CrmPipeline from "./CrmPipeline";
import {
  loadOpportunitiesAction, createPipelineAction, updatePipelineAction, deletePipelineAction,
  createOppAction, updateOppAction, bulkOppAction, listOppsRichAction, getOppAction,
} from "@/app/tenants/[tenantId]/pipelines/crm-actions";
import type { OpportunityRow, Pipeline } from "@/lib/crm";

/**
 * Opportunities hub (D-307.., D-343) — GHL parity. Board (kanban) ↔ List toggle, pipeline
 * switcher (+ create + MANAGE: rename/edit-stages/delete), a sortable/filterable list, a bulk
 * bar, a live pipeline stat bar (open/won/conversion), and a full opportunity DETAIL CARD with
 * owner, source, expected-close and lost-reason. Degrades gracefully pre-0064.
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
  const [managing, setManaging] = useState(false);
  const [openOppId, setOpenOppId] = useState<string | null>(null);

  const selected = useMemo(() => pipelines.find((p) => p.id === selectedId) ?? pipelines[0], [pipelines, selectedId]);
  const ownerOptions = useMemo(() => Array.from(new Set(opps.map((o) => o.ownerEmail).filter(Boolean))) as string[], [opps]);

  // Live pipeline stats (GHL header band).
  const stats = useMemo(() => {
    const open = opps.filter((o) => o.status === "open");
    const won = opps.filter((o) => o.status === "won");
    const lost = opps.filter((o) => o.status === "lost");
    const sum = (a: OpportunityRow[]) => a.reduce((t, o) => t + o.value, 0);
    const decided = won.length + lost.length;
    return { openN: open.length, openV: sum(open), wonN: won.length, wonV: sum(won), lostN: lost.length, conv: decided ? Math.round((won.length / decided) * 100) : 0 };
  }, [opps]);

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
          <p className="text-sm text-slate-500">{selected.name} · {opps.length} deals · {fmt(opps.reduce((a, o) => a + o.value, 0))} total value</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedId} onChange={(e) => switchPipeline(e.target.value)} disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
            {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={addPipeline} disabled={busy} title="New pipeline" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50">＋</button>
          <button onClick={() => setManaging(true)} disabled={busy} title="Manage pipeline & stages" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50">⚙</button>
          <div className="ml-1 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setView("board")} className={`rounded-md px-3 py-1 text-sm font-medium ${view === "board" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Board</button>
            <button onClick={() => { setView("list"); void refreshList(); }} className={`rounded-md px-3 py-1 text-sm font-medium ${view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>List</button>
          </div>
        </div>
      </div>

      {/* Stat bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open" value={`${stats.openN}`} sub={fmt(stats.openV)} tint="text-sky-700" />
        <Stat label="Won" value={`${stats.wonN}`} sub={fmt(stats.wonV)} tint="text-emerald-600" />
        <Stat label="Lost" value={`${stats.lostN}`} sub="closed lost" tint="text-rose-600" />
        <Stat label="Win rate" value={`${stats.conv}%`} sub="won of decided" tint="text-slate-800" />
      </div>

      {view === "board" ? (
        <CrmPipeline key={selectedId} tenantId={tenantId} pipeline={selected} initial={opps} onOpen={setOpenOppId} onChanged={() => void refreshList()} />
      ) : (
        <OppList tenantId={tenantId} pipeline={selected} opps={opps} contacts={contacts} ownerOptions={ownerOptions} setOpps={setOpps} onRefresh={refreshList} onOpen={setOpenOppId} />
      )}

      {managing && (
        <ManagePipelineModal tenantId={tenantId} pipeline={selected} canDelete={pipelines.length > 1}
          onClose={() => setManaging(false)}
          onSaved={async (list, keepId) => { setPipelines(list); setManaging(false); await switchPipeline(list.some((p) => p.id === keepId) ? keepId : list[0].id); }} />
      )}

      {openOppId && (
        <OppDrawer tenantId={tenantId} pipeline={selected} oppId={openOppId} contacts={contacts} ownerOptions={ownerOptions}
          onClose={() => setOpenOppId(null)}
          onChanged={(rows) => setOpps(rows)} />
      )}
    </div>
  );
}

function Stat({ label, value, sub, tint }: { label: string; value: string; sub: string; tint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-xl font-semibold ${tint}`}>{value}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}

// ── Manage pipeline (rename + stage editor + delete) ─────────────────────────
function ManagePipelineModal({ tenantId, pipeline, canDelete, onClose, onSaved }: {
  tenantId: string; pipeline: Pipeline; canDelete: boolean;
  onClose: () => void; onSaved: (pipelines: Pipeline[], keepId: string) => void;
}) {
  const [name, setName] = useState(pipeline.name);
  const [stages, setStages] = useState<string[]>(pipeline.stages.length ? [...pipeline.stages] : ["New"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setStage = (i: number, v: string) => setStages((s) => s.map((x, j) => (j === i ? v : x)));
  const removeStage = (i: number) => setStages((s) => (s.length > 1 ? s.filter((_, j) => j !== i) : s));
  const addStage = () => setStages((s) => [...s, "New stage"]);
  const moveStage = (i: number, dir: -1 | 1) => setStages((s) => { const j = i + dir; if (j < 0 || j >= s.length) return s; const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n; });

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await updatePipelineAction(tenantId, pipeline.id, { name, stages });
      if (!r.ok) { setErr(r.error ?? "Could not save."); return; }
      onSaved(r.pipelines, pipeline.id);
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(`Delete the "${pipeline.name}" pipeline and ALL its opportunities? This cannot be undone.`)) return;
    setBusy(true); setErr(null);
    try {
      const r = await deletePipelineAction(tenantId, pipeline.id);
      if (!r.ok) { setErr(r.error ?? "Could not delete."); return; }
      onSaved(r.pipelines, r.pipelines[0]?.id ?? "");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Manage pipeline</h2>
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Pipeline name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <div className="mt-4">
          <span className="mb-1 block text-xs text-slate-500">Stages (order = board columns)</span>
          <div className="space-y-1.5">
            {stages.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <input value={s} onChange={(e) => setStage(i, e.target.value)} className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30">▲</button>
                <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} className="rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 disabled:opacity-30">▼</button>
                <button onClick={() => removeStage(i)} disabled={stages.length <= 1} className="rounded px-1.5 py-1 text-xs text-rose-400 hover:bg-rose-50 disabled:opacity-30">✕</button>
              </div>
            ))}
          </div>
          <button onClick={addStage} className="mt-2 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-xs text-slate-500 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">＋ Add stage</button>
        </div>
        {err && <div className="mt-3 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={remove} disabled={busy || !canDelete} title={canDelete ? "" : "You can't delete your only pipeline"} className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-40">Delete pipeline</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Opportunity detail card (drawer) — shared by board + list ─────────────────
const fieldCls = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]";
function OppDrawer({ tenantId, pipeline, oppId, contacts, ownerOptions, onClose, onChanged }: {
  tenantId: string; pipeline: Pipeline; oppId: string; contacts: ContactLite[]; ownerOptions: string[];
  onClose: () => void; onChanged: (rows: OpportunityRow[]) => void;
}) {
  const [o, setO] = useState<OpportunityRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { let live = true; setLoading(true); getOppAction(tenantId, oppId).then((r) => { if (live) { setO(r); setLoading(false); } }).catch(() => setLoading(false)); return () => { live = false; }; }, [tenantId, oppId]);
  const set = <K extends keyof OpportunityRow>(k: K, v: OpportunityRow[K]) => setO((p) => (p ? { ...p, [k]: v } : p));

  async function save() {
    if (!o) return;
    setBusy(true);
    try {
      const rows = await updateOppAction(tenantId, pipeline.id, o.id, {
        name: o.name, value: o.value, stage: o.stage, status: o.status, contact_id: o.contact_id,
        ownerEmail: o.ownerEmail ?? null, source: o.source ?? null, lostReason: o.lostReason ?? null, expectedCloseDate: o.expectedCloseDate ?? null,
      });
      onChanged(rows); onClose();
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!o || !confirm(`Delete "${o.name}"?`)) return;
    setBusy(true);
    try { const rows = await bulkOppAction(tenantId, pipeline.id, [o.id], { delete: true }); onChanged(rows); onClose(); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {loading || !o ? (
          <div className="p-8 text-center text-sm text-slate-400">{loading ? "Loading…" : "Opportunity not found."}</div>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">✕ Close</button>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[o.status] ?? "bg-slate-100"}`}>{o.status}</span>
            </div>
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Opportunity name</span>
              <input value={o.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Value</span>
                <input type="number" value={o.value} onChange={(e) => set("value", parseFloat(e.target.value) || 0)} className={fieldCls} /></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Stage</span>
                <select value={o.stage} onChange={(e) => set("stage", e.target.value)} className={fieldCls}>{pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
                <select value={o.status} onChange={(e) => set("status", e.target.value as OpportunityRow["status"])} className={fieldCls}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Expected close</span>
                <input type="date" value={o.expectedCloseDate ?? ""} onChange={(e) => set("expectedCloseDate", e.target.value || null)} className={fieldCls} /></label>
            </div>
            {o.status === "lost" && (
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-rose-400">Lost reason</span>
                <input value={o.lostReason ?? ""} onChange={(e) => set("lostReason", e.target.value)} placeholder="e.g. price, went with competitor…" className={fieldCls} /></label>
            )}
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</span>
              <select value={o.contact_id ?? ""} onChange={(e) => set("contact_id", e.target.value || null)} className={fieldCls}>
                <option value="">— none —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Owner</span>
                <input list="opp-owner-options" value={o.ownerEmail ?? ""} onChange={(e) => set("ownerEmail", e.target.value || null)} placeholder="owner@…" className={fieldCls} />
                <datalist id="opp-owner-options">{ownerOptions.map((x) => <option key={x} value={x} />)}</datalist></label>
              <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Source</span>
                <input value={o.source ?? ""} onChange={(e) => set("source", e.target.value || null)} placeholder="e.g. referral, website…" className={fieldCls} /></label>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button onClick={remove} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-40">Delete</button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OppList({ tenantId, pipeline, opps, contacts, ownerOptions, setOpps, onRefresh, onOpen }: {
  tenantId: string; pipeline: Pipeline; opps: OpportunityRow[]; contacts: ContactLite[]; ownerOptions: string[];
  setOpps: (v: OpportunityRow[]) => void; onRefresh: () => Promise<void>; onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sort, setSort] = useState<{ key: "name" | "value" | "createdAt"; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState({ name: "", value: "", stage: pipeline.stages[0] ?? "New", contactId: "", ownerEmail: "", source: "" });

  const rows = useMemo(() => {
    let r = opps;
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter((o) => o.name.toLowerCase().includes(s) || o.contactName.toLowerCase().includes(s)); }
    if (stageFilter) r = r.filter((o) => o.stage === stageFilter);
    if (statusFilter) r = r.filter((o) => o.status === statusFilter);
    if (ownerFilter) r = r.filter((o) => (o.ownerEmail ?? "") === ownerFilter);
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      if (sort.key === "value") return (a.value - b.value) * dir;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      return String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")) * dir;
    });
  }, [opps, q, stageFilter, statusFilter, ownerFilter, sort]);

  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));
  function toggleAll() { setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id))); }
  function toggle(id: string) { setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function patch(id: string, p: Parameters<typeof updateOppAction>[3]) {
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
    try { await createOppAction(tenantId, pipeline.id, { name: nf.name.trim(), value: parseFloat(nf.value) || 0, stage: nf.stage, contactId: nf.contactId || null, ownerEmail: nf.ownerEmail || null, source: nf.source || null }); await onRefresh(); setNf({ name: "", value: "", stage: pipeline.stages[0] ?? "New", contactId: "", ownerEmail: "", source: "" }); setCreating(false); }
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
        {ownerOptions.length > 0 && (
          <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-600"><option value="">All owners</option>{ownerOptions.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        )}
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
              <th className="px-3 py-2.5">Owner</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">{sortBtn("value", "Value")}</th>
              <th className="px-3 py-2.5">{sortBtn("createdAt", "Created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No opportunities match.</td></tr>
            ) : rows.map((o) => (
              <tr key={o.id} className={sel.has(o.id) ? "bg-blue-50/40" : "hover:bg-slate-50"}>
                <td className="px-3 py-2"><input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4" /></td>
                <td className="px-3 py-2"><button onClick={() => onOpen(o.id)} className="text-left font-medium text-slate-900 hover:text-[#1e3a8a] hover:underline">{o.name}</button></td>
                <td className="px-3 py-2">
                  <select value={o.contact_id ?? ""} onChange={(e) => patch(o.id, { contact_id: e.target.value || null })} disabled={busy} className="max-w-[150px] truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-600 hover:border-slate-200">
                    <option value="">— none —</option>
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{o.ownerEmail || "—"}</td>
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
              <input value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="Deal name" className={fieldCls} />
              <div className="grid grid-cols-2 gap-2">
                <input value={nf.value} onChange={(e) => setNf({ ...nf, value: e.target.value })} placeholder="Value $" type="number" className={fieldCls} />
                <select value={nf.stage} onChange={(e) => setNf({ ...nf, stage: e.target.value })} className={fieldCls}>{pipeline.stages.map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <select value={nf.contactId} onChange={(e) => setNf({ ...nf, contactId: e.target.value })} className={fieldCls}><option value="">— link a contact (optional) —</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ""}</option>)}</select>
              <div className="grid grid-cols-2 gap-2">
                <input list="opp-owner-options" value={nf.ownerEmail} onChange={(e) => setNf({ ...nf, ownerEmail: e.target.value })} placeholder="Owner (optional)" className={fieldCls} />
                <input value={nf.source} onChange={(e) => setNf({ ...nf, source: e.target.value })} placeholder="Source (optional)" className={fieldCls} />
                <datalist id="opp-owner-options">{ownerOptions.map((x) => <option key={x} value={x} />)}</datalist>
              </div>
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
