"use client";

import { useEffect, useState } from "react";
import {
  getDriveConnectUrl, getDriveStatus, listTenantDriveImages, importDriveImages, disconnectDriveAction,
} from "@/app/tenants/[tenantId]/website/drive-actions";

type DriveImg = { id: string; name: string; mimeType: string; thumbnailLink?: string; iconLink?: string; size?: number };

/** Google Drive import: connect (OAuth), browse the tenant's Drive images, import selected into the
 *  Media Library (optimized → R2). Self-contained; calls onImported() to refresh the library. */
export default function DriveTab({ tenantId, onImported, notify, importFolderId }: { tenantId: string; onImported: () => void; notify: (m: string) => void; importFolderId?: string | null }) {
  const [status, setStatus] = useState<{ ready: boolean; connected: boolean; email: string | null } | null>(null);
  const [files, setFiles] = useState<DriveImg[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [nextPage, setNextPage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getDriveStatus(tenantId).then(setStatus).catch(() => setStatus({ ready: false, connected: false, email: null })).finally(() => setLoading(false)); }, [tenantId]);

  const load = async (pageToken?: string, q?: string) => {
    setBusy(true);
    try {
      const r = await listTenantDriveImages(tenantId, { pageToken, query: q ?? query });
      if (!r.ok) { notify(r.error ?? "Could not list Drive images."); setBusy(false); return; }
      setFiles((prev) => pageToken ? [...prev, ...r.files] : r.files);
      setNextPage(r.nextPageToken);
    } catch (e: any) { notify(e?.message ?? "Something went wrong"); } finally { setBusy(false); }
  };
  useEffect(() => { if (status?.connected) load(); /* eslint-disable-next-line */ }, [status?.connected]);

  const connect = async () => {
    const r = await getDriveConnectUrl(tenantId);
    if (r.ok && r.url) window.location.href = r.url; else notify(r.error ?? "Drive isn't configured yet.");
  };
  const disconnect = async () => { await disconnectDriveAction(tenantId); setStatus((s) => s ? { ...s, connected: false, email: null } : s); setFiles([]); setSel(new Set()); };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const doImport = async () => {
    if (!sel.size) return;
    setBusy(true);
    try {
      const r = await importDriveImages(tenantId, [...sel], { folderId: importFolderId ?? null });
      notify(r.imported ? `Imported ${r.imported} image${r.imported === 1 ? "" : "s"} from Drive.${r.errors.length ? ` (${r.errors.length} skipped)` : ""}` : (r.errors[0] ?? "Nothing imported."));
      setSel(new Set()); onImported();
    } catch (e: any) { notify(e?.message ?? "Something went wrong"); } finally { setBusy(false); }
  };

  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Checking Google Drive…</div>;

  if (!status?.ready) return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Google Drive isn’t set up yet. A platform admin must add the <b>Google Drive (media import)</b> app in
      <b> Platform → Connected apps</b> (Client ID + Secret), then tenants can connect their own Drive here.
    </div>
  );

  if (!status.connected) return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-700">Import images from your Google Drive</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">Connect your Google account (read-only) to browse and import your Drive images straight into your Media Library.</p>
      <button onClick={connect} className="mt-4 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90">Connect Google Drive</button>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">Connected{status.email ? <> · <b className="text-slate-700">{status.email}</b></> : null}</span>
        <button onClick={disconnect} className="text-xs text-slate-400 hover:text-red-500">Disconnect</button>
        <div className="ml-auto flex items-center gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (setFiles([]), load(undefined, query))}
            placeholder="Search Drive…" className="w-40 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
          <button disabled={!sel.size || busy} onClick={doImport} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
            {busy ? "Importing…" : `Import${sel.size ? ` (${sel.size})` : ""}`}
          </button>
        </div>
      </div>
      {!files.length && !busy ? (
        <div className="p-8 text-center text-sm text-slate-400">No images found in your Drive.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {files.map((f) => (
            <button key={f.id} type="button" onClick={() => toggle(f.id)}
              className={`group relative overflow-hidden rounded-lg border bg-white text-left ${sel.has(f.id) ? "border-[#1e3a8a] ring-2 ring-[#1e3a8a]/30" : "border-slate-200 hover:border-slate-300"}`}>
              <div className="aspect-square bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.thumbnailLink || f.iconLink} alt={f.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              </div>
              {sel.has(f.id) && <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-[#1e3a8a] text-[11px] text-white">✓</span>}
              <div className="truncate px-1.5 py-1 text-[11px] text-slate-600" title={f.name}>{f.name}</div>
            </button>
          ))}
        </div>
      )}
      {nextPage && <div className="mt-3 text-center"><button disabled={busy} onClick={() => load(nextPage)} className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50">{busy ? "Loading…" : "Load more"}</button></div>}
    </div>
  );
}
