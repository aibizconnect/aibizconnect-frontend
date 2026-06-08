"use client";

import { useEffect, useState } from "react";
import {
  getCanvaConnectUrl, getCanvaStatus, listTenantCanvaDesigns, importCanvaDesigns, disconnectCanvaAction,
} from "@/app/tenants/[tenantId]/website/canva-actions";

type Design = { id: string; title: string; thumbnail?: string };

/** Canva import: connect (OAuth+PKCE), browse the tenant's designs, export selected ones to PNG and
 *  import into the Media Library (→ R2). Self-contained; calls onImported() to refresh the library. */
export default function CanvaTab({ tenantId, onImported, notify, importFolderId }: { tenantId: string; onImported: () => void; notify: (m: string) => void; importFolderId?: string | null }) {
  const [status, setStatus] = useState<{ ready: boolean; connected: boolean; name: string | null } | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [sel, setSel] = useState<Map<string, string>>(new Map()); // id → title
  const [query, setQuery] = useState("");
  const [cont, setCont] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getCanvaStatus(tenantId).then(setStatus).catch(() => setStatus({ ready: false, connected: false, name: null })).finally(() => setLoading(false)); }, [tenantId]);

  const load = async (continuation?: string, q?: string) => {
    setBusy(true);
    try {
      const r = await listTenantCanvaDesigns(tenantId, { continuation, query: q ?? query });
      if (!r.ok) { notify(r.error ?? "Could not list Canva designs."); setBusy(false); return; }
      setDesigns((prev) => continuation ? [...prev, ...r.designs] : r.designs);
      setCont(r.continuation);
    } catch (e: any) { notify(e?.message ?? "Something went wrong"); } finally { setBusy(false); }
  };
  useEffect(() => { if (status?.connected) load(); /* eslint-disable-next-line */ }, [status?.connected]);

  const connect = async () => { const r = await getCanvaConnectUrl(tenantId); if (r.ok && r.url) window.location.href = r.url; else notify(r.error ?? "Canva isn't configured yet."); };
  const disconnect = async () => { await disconnectCanvaAction(tenantId); setStatus((s) => s ? { ...s, connected: false, name: null } : s); setDesigns([]); setSel(new Map()); };
  const toggle = (d: Design) => setSel((s) => { const n = new Map(s); n.has(d.id) ? n.delete(d.id) : n.set(d.id, d.title); return n; });
  const doImport = async () => {
    if (!sel.size) return;
    setBusy(true);
    try {
      const r = await importCanvaDesigns(tenantId, [...sel].map(([id, title]) => ({ id, title })), { folderId: importFolderId ?? null });
      notify(r.imported ? `Imported ${r.imported} from Canva.${r.errors.length ? ` (${r.errors.length} skipped)` : ""}` : (r.errors[0] ?? "Nothing imported."));
      setSel(new Map()); onImported();
    } catch (e: any) { notify(e?.message ?? "Something went wrong"); } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Checking Canva…</div>;

  if (!status?.ready) return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Canva isn’t set up yet. A platform admin must add the <b>Canva (media import)</b> app in
      <b> Platform → Connected apps</b> (Client ID + Secret), then tenants can connect their own Canva here.
    </div>
  );

  if (!status.connected) return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-6 text-center">
      <p className="text-sm font-semibold text-violet-800">Import your Canva designs</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-violet-600">Connect your Canva account to browse your designs and import them as images straight into your Media Library.</p>
      <button onClick={connect} className="mt-4 rounded-lg bg-[#7d2ae8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6b22c9]">Connect Canva</button>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Connected{status.name ? <> · <b className="text-slate-700">{status.name}</b></> : null}</span>
        <button onClick={disconnect} className="text-xs text-slate-400 hover:text-red-500">Disconnect</button>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setDesigns([]), load(undefined, query))}
            placeholder="Search designs…" className="w-40 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
          <button disabled={!sel.size || busy} onClick={doImport} className="rounded-lg bg-[#7d2ae8] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Importing…" : `Import${sel.size ? ` (${sel.size})` : ""}`}
          </button>
        </div>
      </div>
      {busy && !designs.length ? <div className="p-8 text-center text-sm text-slate-400">Loading designs…</div>
        : !designs.length ? <div className="p-8 text-center text-sm text-slate-400">No designs found.</div>
        : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {designs.map((d) => (
            <button key={d.id} type="button" onClick={() => toggle(d)}
              className={`group relative overflow-hidden rounded-lg border bg-white text-left ${sel.has(d.id) ? "border-[#7d2ae8] ring-2 ring-[#7d2ae8]/30" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="aspect-square bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.thumbnail ? <img src={d.thumbnail} alt={d.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl text-violet-300">🎨</div>}
              </div>
              {sel.has(d.id) && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#7d2ae8] text-[11px] text-white">✓</span>}
              <div className="truncate px-1.5 py-1 text-[11px] text-slate-600" title={d.title}>{d.title}</div>
            </button>
          ))}
        </div>
      )}
      {cont && <div className="mt-3 text-center"><button disabled={busy} onClick={() => load(cont)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">{busy ? "Loading…" : "Load more"}</button></div>}
      <p className="mt-3 text-center text-[11px] text-slate-400">Canva exports run as a job — importing a design can take a few seconds.</p>
    </div>
  );
}
