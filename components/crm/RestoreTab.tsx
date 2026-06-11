"use client";

import { useEffect, useState, useTransition } from "react";
import type { ContactFull } from "@/lib/crm";
import { listContactsPageAction, restoreContactsAction, purgeContactsAction } from "@/app/tenants/[tenantId]/contacts/crm-actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

/** Restore tab (GHL parity, D-234): soft-deleted contacts — restore or delete forever. */
export default function RestoreTab({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<ContactFull[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, startT] = useTransition();

  const reload = () => startT(async () => {
    try { const r = await listContactsPageAction(tenantId, { deleted: true, pageSize: 200 }); setRows(r.rows); setSel(new Set()); }
    catch (e: any) { notifyError(e?.message || "Could not load."); }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [tenantId]);

  const restore = async () => {
    const r = await restoreContactsAction(tenantId, Array.from(sel));
    if (!r.ok) notifyError(r.error || "Restore failed.");
    reload();
  };
  const purge = async () => {
    if (!(await confirmDialog(`Permanently delete ${sel.size} contact${sel.size === 1 ? "" : "s"}? This CANNOT be undone.`, { danger: true, confirmText: "Delete forever" }))) return;
    const r = await purgeContactsAction(tenantId, Array.from(sel));
    if (!r.ok) notifyError(r.error || "Delete failed.");
    reload();
  };
  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Deleted contacts wait here — restore them or remove them permanently.</p>
      {sel.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#1e3a8a]/20 bg-[#1e3a8a]/5 px-3 py-2 text-sm">
          <span className="font-medium text-[#1e3a8a]">{sel.size} selected</span>
          <button onClick={restore} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50">↩ Restore</button>
          <button onClick={purge} className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Delete forever</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-3"><input type="checkbox" checked={allChecked} onChange={() => setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)))} /></th>
              <th className="px-3 py-3">Name</th><th className="px-3 py-3">Email</th><th className="px-3 py-3">Phone</th><th className="px-3 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">{pending ? "Loading…" : "Trash is empty."}</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(c.id)} onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })} /></td>
                <td className="px-3 py-2.5 font-medium text-slate-700">{c.name || "—"}</td>
                <td className="px-3 py-2.5 text-slate-500">{c.email || "—"}</td>
                <td className="px-3 py-2.5 text-slate-500">{c.phone || "—"}</td>
                <td className="px-3 py-2.5 text-slate-500">{c.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
