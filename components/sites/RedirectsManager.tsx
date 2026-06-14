"use client";

import { useEffect, useState } from "react";
import { listRedirectsAction, saveRedirectAction, deleteRedirectAction } from "@/app/tenants/[tenantId]/sites/redirects/actions";
import type { UrlRedirect } from "@/lib/server/redirects";

/** URL Redirects manager (D-347). Map an old/short path on your site to any destination (301/302). */
const inp = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";

export default function RedirectsManager({ tenantId, origin }: { tenantId: string; origin: string }) {
  const [list, setList] = useState<UrlRedirect[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("https://");
  const [code, setCode] = useState(301);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { listRedirectsAction(tenantId).then(setList).catch(() => setList([])); }, [tenantId]);

  async function add() {
    if (!from.trim() || !to.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await saveRedirectAction(tenantId, { fromPath: from, toUrl: to, code });
      if (!r.ok) setErr(r.error ?? "Could not save."); else { setList(r.redirects); setFrom(""); setTo("https://"); setCode(301); }
    } finally { setBusy(false); }
  }
  const base = `${origin}/sites/${tenantId}/`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Add a redirect</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">From (path on your site)</span>
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="old-offer" className={`${inp} w-44`} /></label>
          <span className="pb-2 text-slate-300">→</span>
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">To (full URL or /path)</span>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="https://…" className={`${inp} w-72`} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">Type</span>
            <select value={code} onChange={(e) => setCode(Number(e.target.value))} className={inp}><option value={301}>301 permanent</option><option value={302}>302 temporary</option></select></label>
          <button onClick={add} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "…" : "Add"}</button>
        </div>
        {err && <div className="mt-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
        <p className="mt-2 text-xs text-slate-400">Your site base is <code className="text-slate-500">{base}</code> — so a “From” of <code>old-offer</code> redirects <code>{base}old-offer</code>.</p>
      </div>

      {list === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No redirects yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2.5">From</th><th className="px-3 py-2.5">To</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5 text-right">Hits</th><th className="px-3 py-2.5"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-700">/{r.fromPath}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-slate-600">{r.toUrl}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.code === 301 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.code}</span></td>
                  <td className="px-3 py-2 text-right text-slate-400">{r.hits}</td>
                  <td className="px-3 py-2 text-right"><button onClick={async () => { if (confirm(`Delete /${r.fromPath}?`)) setList(await deleteRedirectAction(tenantId, r.id)); }} className="text-slate-400 hover:text-red-600">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
