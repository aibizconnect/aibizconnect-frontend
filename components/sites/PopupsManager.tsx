"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { savePopupAction, deletePopupAction } from "@/app/tenants/[tenantId]/sites/popup-actions";
import { DEFAULT_POPUP, type Popup, type PopupContent } from "@/lib/popups";

/** GHL-style Popups manager. Create/edit exit-intent, timed, or on-load popups. */
export default function PopupsManager({ tenantId, initial }: { tenantId: string; initial: Popup[] }) {
  const [popups, setPopups] = useState<Popup[]>(initial);
  const [editing, setEditing] = useState<{ id?: string; name: string; content: PopupContent } | null>(null);
  const [pending, start] = useTransition();
  const field = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";

  const newPopup = () => setEditing({ name: "New popup", content: { ...DEFAULT_POPUP } });
  const save = () => editing && start(async () => {
    const r = await savePopupAction(tenantId, editing.name, editing.content, editing.id);
    if (r.ok) { setPopups(r.popups); setEditing(null); }
  });
  const del = (id: string) => start(async () => setPopups((await deletePopupAction(tenantId, id)).popups));
  const set = (patch: Partial<PopupContent>) => editing && setEditing({ ...editing, content: { ...editing.content, ...patch } });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Popups</h1>
          <p className="text-sm text-slate-500">Capture leads with exit-intent, timed, or on-load popups across your site.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tenants/${tenantId}/sites`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">← Websites</Link>
          <button onClick={newPopup} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">＋ New popup</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ul className="space-y-2">
          {popups.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">No popups yet.</li>}
          {popups.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${p.content.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.content.enabled ? "Active" : "Off"}</span>
                </div>
                <div className="text-[11px] text-slate-400">trigger: {p.content.trigger}{p.content.trigger === "timer" ? ` (${p.content.delaySec}s)` : ""} · {p.content.position} · {p.content.width}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ id: p.id, name: p.name, content: p.content })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Edit</button>
                <button onClick={() => del(p.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </li>
          ))}
        </ul>

        {editing && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-slate-900">{editing.id ? "Edit popup" : "New popup"}</h2>
            <div className="space-y-3">
              <label className="block"><span className="text-xs text-slate-500">Name (internal)</span><input className={field} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label className="block"><span className="text-xs text-slate-500">Heading</span><input className={field} value={editing.content.heading} onChange={(e) => set({ heading: e.target.value })} /></label>
              <label className="block"><span className="text-xs text-slate-500">Body</span><textarea className={field} rows={2} value={editing.content.body} onChange={(e) => set({ body: e.target.value })} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-xs text-slate-500">Button label</span><input className={field} value={editing.content.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} /></label>
                <label className="block"><span className="text-xs text-slate-500">Button link</span><input className={field} value={editing.content.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} /></label>
                <label className="block"><span className="text-xs text-slate-500">Trigger</span>
                  <select className={field} value={editing.content.trigger} onChange={(e) => set({ trigger: e.target.value as PopupContent["trigger"] })}>
                    <option value="exit">Exit intent</option><option value="timer">After delay</option><option value="load">On load</option>
                  </select>
                </label>
                <label className="block"><span className="text-xs text-slate-500">Delay (s)</span><input type="number" className={field} value={editing.content.delaySec} onChange={(e) => set({ delaySec: +e.target.value })} /></label>
                <label className="block"><span className="text-xs text-slate-500">Width</span>
                  <select className={field} value={editing.content.width} onChange={(e) => set({ width: e.target.value as PopupContent["width"] })}>
                    <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                  </select>
                </label>
                <label className="block"><span className="text-xs text-slate-500">Position</span>
                  <select className={field} value={editing.content.position} onChange={(e) => set({ position: e.target.value as PopupContent["position"] })}>
                    <option value="center">Center</option><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top">Top</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={editing.content.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Active</label>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">Cancel</button>
                <button onClick={save} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save popup"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
