"use client";

import { useEffect, useState } from "react";
import { listBlockDomainsAction, saveBlockDomainAction, deleteBlockDomainAction } from "@/app/tenants/[tenantId]/sites/listings/actions";
import type { BlockDomain } from "@/lib/server/idx/block-domains";
import type { BlockFilter } from "@/lib/idx/block-config";

/**
 * Layer 2 of the listings block: the domains allowed to embed this agent's block, each with the
 * slice of the feed that's relevant there. While the list is empty the block works anywhere;
 * the first domain added turns the list into an allowlist. Page-level snippet filters can only
 * narrow a domain's slice, never widen it.
 */
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-medium text-slate-600";

const scopeSummary = (f: BlockFilter): string => {
  const parts = [f.class, f.t, f.city, f.community, f.min != null && `from $${f.min.toLocaleString()}`, f.max != null && `to $${f.max.toLocaleString()}`, f.beds != null && `${f.beds}+ bd`, f.baths != null && `${f.baths}+ ba`];
  const s = parts.filter(Boolean).join(" · ");
  return s || "Whole feed";
};

export default function BlockDomainsAdmin({ tenantId }: { tenantId: string }) {
  const [domains, setDomains] = useState<BlockDomain[] | null>(null);
  const [form, setForm] = useState<{ id?: string; domain: string; label: string; filter: BlockFilter }>({ domain: "", label: "", filter: {} });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { listBlockDomainsAction(tenantId).then(setDomains).catch(() => setDomains([])); }, [tenantId]);

  const setF = (k: keyof BlockFilter, v: string) => setForm((p) => ({ ...p, filter: { ...p.filter, [k]: v === "" ? undefined : v } }));
  const setN = (k: keyof BlockFilter, v: string) => setForm((p) => ({ ...p, filter: { ...p.filter, [k]: v === "" ? undefined : Number(v) } }));
  const num = (v: unknown) => (v == null ? "" : String(v));
  const clear = () => setForm({ domain: "", label: "", filter: {} });

  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveBlockDomainAction(tenantId, { id: form.id, domain: form.domain, label: form.label, filter: form.filter });
    setBusy(false); setDomains(r.domains);
    if (!r.ok) setMsg(r.error ?? "Could not save."); else { clear(); setMsg("Saved ✓"); }
  }
  async function remove(id: string) {
    setBusy(true);
    const r = await deleteBlockDomainAction(tenantId, id);
    setBusy(false); setDomains(r.domains);
    if (!r.ok) setMsg(r.error ?? "Could not remove.");
  }
  async function toggleActive(d: BlockDomain) {
    setBusy(true);
    const r = await saveBlockDomainAction(tenantId, { id: d.id, domain: d.domain, label: d.label, filter: d.filter, active: !d.active });
    setBusy(false); setDomains(r.domains);
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">Block domains</h2>
      <p className="mt-1 text-xs text-slate-500">
        Websites allowed to embed your listings block, and which listings are relevant on each. Empty list = the block works on any site.
      </p>

      {domains === null ? (
        <div className="py-6 text-center text-sm text-slate-400">Loading…</div>
      ) : domains.length === 0 ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No domains registered — your block currently renders on any website that has the snippet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {domains.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {d.domain}{!d.active && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">paused</span>}
                </div>
                <div className="truncate text-xs text-slate-500">{d.label ? `${d.label} — ` : ""}{scopeSummary(d.filter)}</div>
              </div>
              <div className="flex shrink-0 gap-2 text-xs">
                <button disabled={busy} onClick={() => setForm({ id: d.id, domain: d.domain, label: d.label ?? "", filter: d.filter })} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">Edit</button>
                <button disabled={busy} onClick={() => toggleActive(d)} className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-50">{d.active ? "Pause" : "Resume"}</button>
                <button disabled={busy} onClick={() => remove(d.id)} className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{form.id ? "Edit domain" : "Add a domain"}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Domain</label><input value={form.domain} onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))} placeholder="listings.example.com" className={inp} /></div>
          <div><label className={lbl}>Label (optional)</label><input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="Downtown condos site" className={inp} /></div>
          <div><label className={lbl}>Property class</label>
            <select value={form.filter.class ?? ""} onChange={(e) => setF("class", e.target.value)} className={inp}>
              <option value="">Any</option><option>Residential</option><option>Condo &amp; Other</option><option>Commercial</option>
            </select></div>
          <div><label className={lbl}>Sale / Lease</label>
            <select value={form.filter.t ?? ""} onChange={(e) => setF("t", e.target.value)} className={inp}>
              <option value="">Any</option><option>For Sale</option><option>For Lease</option>
            </select></div>
          <div><label className={lbl}>City / area</label><input value={form.filter.city ?? ""} onChange={(e) => setF("city", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Community</label><input value={form.filter.community ?? ""} onChange={(e) => setF("community", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Min price</label><input type="number" value={num(form.filter.min)} onChange={(e) => setN("min", e.target.value)} className={inp} /></div>
          <div><label className={lbl}>Max price</label><input type="number" value={num(form.filter.max)} onChange={(e) => setN("max", e.target.value)} className={inp} /></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button disabled={busy || !form.domain.trim()} onClick={save} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : form.id ? "Save domain" : "Add domain"}</button>
          {form.id && <button disabled={busy} onClick={clear} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>}
          {msg && <span className="text-xs text-slate-500">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
