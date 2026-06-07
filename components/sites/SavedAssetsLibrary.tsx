"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { listAssetsAction, deleteAssetAction, updateAssetHeadingAction, createStarterBlockAction } from "@/app/tenants/[tenantId]/sites/asset-actions";
import type { AssetTier, SavedAsset } from "@/lib/saved-assets";

const TIERS: { key: AssetTier; label: string; blurb: string; color: string }[] = [
  { key: "template", label: "Templates", blurb: "Saved as a copy — reuse anywhere; edits don't propagate.", color: "indigo" },
  { key: "global", label: "Global (this website)", blurb: "Edit once → every instance on this website updates.", color: "sky" },
  { key: "universal", label: "Universal (all websites)", blurb: "Edit once → syncs across all your websites.", color: "emerald" },
];

export default function SavedAssetsLibrary({ tenantId, initial }: { tenantId: string; initial: Record<AssetTier, SavedAsset[]> }) {
  const [assets, setAssets] = useState(initial);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const refresh = (p: Promise<Record<AssetTier, SavedAsset[]>>) => start(async () => setAssets(await p));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Saved Assets</h1>
          <p className="text-sm text-slate-500">Reusable sections &amp; elements. Save once, reuse — and choose whether edits sync.</p>
        </div>
        <Link href={`/tenants/${tenantId}/sites`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Back to Websites</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((t) => {
          const list = assets[t.key] ?? [];
          return (
            <div key={t.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t.label}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{list.length}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t.blurb}</p>

              {t.key !== "template" && (
                <button
                  onClick={() => refresh(createStarterBlockAction(tenantId, t.key as "global" | "universal", `New ${t.label}`).then((r) => r.assets))}
                  disabled={pending}
                  className="mt-3 w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm text-slate-500 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a] disabled:opacity-50">
                  ＋ New {t.key} block
                </button>
              )}

              <ul className="mt-3 space-y-2">
                {list.length === 0 && <li className="rounded-lg bg-slate-50 p-3 text-center text-xs text-slate-400">None yet — save a section from the editor, or create one above.</li>}
                {list.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-800">{a.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{a.kind}</span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-slate-400">{String(a.content?.heading ?? a.content?.type ?? "section")}</div>

                    {editing?.id === a.id ? (
                      <div className="mt-2 flex gap-1">
                        <input value={editing.value} onChange={(e) => setEditing({ id: a.id, value: e.target.value })}
                          className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                        <button onClick={() => { refresh(updateAssetHeadingAction(tenantId, a.id, a.content, editing.value)); setEditing(null); }}
                          className="rounded bg-[#1e3a8a] px-2 py-1 text-xs text-white">Save</button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-3 text-[11px]">
                        {t.key !== "template" && (
                          <button onClick={() => setEditing({ id: a.id, value: String(a.content?.heading ?? "") })} className="text-sky-600 hover:underline">Edit heading (syncs)</button>
                        )}
                        <button onClick={() => refresh(deleteAssetAction(tenantId, t.key, a.id))} className="text-red-500 hover:underline">Delete</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">Tip: editing a Global or Universal asset updates every page that uses it — instantly, everywhere.</p>
    </div>
  );
}
