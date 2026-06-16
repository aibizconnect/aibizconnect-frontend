"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminDeleteUser, adminSetUserBanned } from "@/app/platform/admin-actions";
import type { AdminUser } from "@/lib/server/admin-directory";

/** Platform User admin table — every auth user. Ban/reactivate + hard-delete. You can't act on
 *  your own account, and superadmins are shielded from delete here. */
export default function PlatformUsers({ initial, currentEmail }: { initial: AdminUser[]; currentEmail: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "—");

  async function del(u: AdminUser) {
    if (!confirm(`Permanently delete ${u.email}? This removes their sign-in account. This cannot be undone.`)) return;
    setBusyId(u.id); setErr(null);
    const r = await adminDeleteUser(u.id);
    setBusyId(null);
    if (r.ok) { setRows((rs) => rs.filter((x) => x.id !== u.id)); router.refresh(); }
    else setErr(r.message ?? "Delete failed.");
  }
  async function ban(u: AdminUser, banned: boolean) {
    setBusyId(u.id); setErr(null);
    const r = await adminSetUserBanned(u.id, banned);
    setBusyId(null);
    if (r.ok) { setRows((rs) => rs.map((x) => (x.id === u.id ? { ...x, banned } : x))); router.refresh(); }
    else setErr(r.message ?? "Update failed.");
  }

  const roleBadge = (role: string | null) =>
    role === "superadmin" ? "bg-violet-100 text-violet-700"
    : role === "admin" ? "bg-emerald-100 text-emerald-700"
    : role === "staff" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500";

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500">Every sign-in account on the platform (team + tenant users). Deleting removes the auth account; ban deactivates it without deleting.</p>
      {err && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">User</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Last sign-in</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No users.</td></tr>
            ) : rows.map((u) => {
              const isSelf = u.email === currentEmail.toLowerCase();
              const isSuper = u.platformRole === "superadmin";
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name}</div>
                    <div className="text-[12px] text-slate-500">{u.email}{isSelf && <span className="ml-1 text-slate-400">(you)</span>}</div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge(u.platformRole)}`}>{u.platformRole ?? "user"}</span></td>
                  <td className="px-4 py-3">
                    {u.banned ? <span className="text-xs text-rose-600">Deactivated</span>
                      : u.confirmed ? <span className="text-xs text-emerald-600">Active</span>
                      : <span className="text-xs text-amber-600">Unconfirmed</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmt(u.lastSignInAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {isSelf || isSuper ? (
                      <span className="text-[11px] text-slate-400">{isSelf ? "—" : "protected"}</span>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button disabled={busyId === u.id} onClick={() => ban(u, !u.banned)} className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40">{u.banned ? "Reactivate" : "Ban"}</button>
                        <button disabled={busyId === u.id} onClick={() => del(u)} className="text-sm text-rose-500 hover:text-rose-700 disabled:opacity-40">{busyId === u.id ? "…" : "Delete"}</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
