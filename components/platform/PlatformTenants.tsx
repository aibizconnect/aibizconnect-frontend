"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteTenant } from "@/app/platform/admin-actions";
import type { AdminTenant } from "@/lib/server/admin-directory";

/** Platform Tenant admin table. Delete is gated behind a typed-name confirmation; the platform
 *  tenant can't be deleted at all. */
export default function PlatformTenants({ initial }: { initial: AdminTenant[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  async function doDelete(t: AdminTenant) {
    setBusyId(t.id); setErr(null);
    const r = await adminDeleteTenant(t.id);
    setBusyId(null);
    if (r.ok) { setRows((rs) => rs.filter((x) => x.id !== t.id)); setConfirmId(null); setTyped(""); router.refresh(); }
    else setErr(r.message ?? "Delete failed.");
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">Every workspace on the platform. Deleting a tenant permanently removes <b>all</b> of its data (site, listings, CRM, everything). The platform tenant is protected.</p>
      {err && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">Tenant</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Created</th><th className="px-4 py-2">Location</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No tenants.</td></tr>
            ) : rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{t.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{t.id}{t.slug ? ` · /${t.slug}` : ""}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.plan ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{fmt(t.createdAt)}</td>
                <td className="px-4 py-3 text-slate-500">{t.location ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {t.isProtected ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Protected</span>
                  ) : confirmId === t.id ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type "${t.name}"`}
                        className="w-48 rounded-md border border-rose-300 px-2 py-1 text-xs outline-none focus:border-rose-500" />
                      <div className="flex gap-2">
                        <button onClick={() => { setConfirmId(null); setTyped(""); }} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
                        <button disabled={typed !== t.name || busyId === t.id} onClick={() => doDelete(t)}
                          className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40">
                          {busyId === t.id ? "Deleting…" : "Delete forever"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setConfirmId(t.id); setTyped(""); setErr(null); }} className="text-sm text-rose-500 hover:text-rose-700">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">Tenant delete uses the cascade RPC — apply <code>0075_delete_tenant_cascade.sql</code> if a delete reports the function is missing.</p>
    </div>
  );
}
