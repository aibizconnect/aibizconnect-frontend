"use client";

import { useState } from "react";
import type { TeamMember } from "@/lib/auth/team";
import { createTeamMemberAction, setTeamRoleAction, setTeamActiveAction, listTeamAction } from "@/app/tenants/[tenantId]/team/actions";

const ROLES = ["superadmin", "admin", "staff"] as const;
const ROLE_BADGE: Record<string, string> = {
  superadmin: "bg-violet-100 text-violet-700",
  admin: "bg-emerald-100 text-emerald-700",
  staff: "bg-sky-100 text-sky-700",
};

export default function TeamConsole({ initial, isOwner = false }: { initial: TeamMember[]; isOwner?: boolean }) {
  const [team, setTeam] = useState<TeamMember[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "staff", password: "" });
  // Only owners (sysadmin allowlist) may create or assign the superadmin role.
  const roleOptions = isOwner ? ROLES : ROLES.filter((r) => r !== "superadmin");

  async function refresh() {
    try { setTeam(await listTeamAction()); } catch { /* keep current */ }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await createTeamMemberAction(form);
    setBusy(false);
    if (!r.ok) { setErr(r.message ?? "Failed."); return; }
    setForm({ name: "", email: "", role: "staff", password: "" });
    refresh();
  }

  async function changeRole(m: TeamMember, role: string) {
    if (role === m.role) return;
    setTeam((t) => t.map((x) => (x.id === m.id ? { ...x, role: role as any } : x)));
    const r = await setTeamRoleAction(m.id, m.email, role);
    if (!r.ok) { setErr(r.message ?? "Failed."); refresh(); }
  }

  async function toggleActive(m: TeamMember) {
    const next = !m.active;
    if (!next && !confirm(`Deactivate ${m.email}? They won't be able to sign in.`)) return;
    setTeam((t) => t.map((x) => (x.id === m.id ? { ...x, active: next } : x)));
    const r = await setTeamActiveAction(m.id, m.email, next);
    if (!r.ok) { setErr(r.message ?? "Failed."); refresh(); }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team</h1>
        <p className="text-sm text-slate-500">Manage the AI Biz Connect platform team. New members can sign in immediately — their email is pre-confirmed.</p>
      </div>

      {/* Create */}
      <form onSubmit={create} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Add a team member</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@aibizconnect.app" type="email" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Temp password (8+)" type="text" required minLength={8} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{busy ? "Creating…" : "Create member"}</button>
          <span className="text-xs text-slate-400">Share the temp password securely; they can change it after signing in.</span>
        </div>
      </form>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">Member</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Last sign-in</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {team.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">No team members yet — add one above.</td></tr>
            ) : team.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-800">{m.name}</div>
                  <div className="text-xs text-slate-400">{m.email}</div>
                </td>
                <td className="px-4 py-2">
                  {m.role === "superadmin" && !isOwner ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ROLE_BADGE.superadmin}`}>superadmin</span>
                  ) : (
                    <select value={m.role ?? "staff"} onChange={(e) => changeRole(m, e.target.value)}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${ROLE_BADGE[m.role ?? "staff"]}`}>
                      {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2">
                  {m.active ? <span className="text-xs text-emerald-600">● Active</span> : <span className="text-xs text-slate-400">○ Deactivated</span>}
                  {!m.confirmed && <span className="ml-1 text-xs text-amber-500">(unconfirmed)</span>}
                </td>
                <td className="px-4 py-2 text-xs text-slate-400">{m.lastSignInAt ? new Date(m.lastSignInAt).toISOString().slice(0, 10) : "never"}</td>
                <td className="px-4 py-2 text-right">
                  {m.role === "superadmin" && !isOwner ? (
                    <span className="text-xs text-slate-300">—</span>
                  ) : (
                    <button onClick={() => toggleActive(m)} className={`text-xs font-medium ${m.active ? "text-rose-600 hover:underline" : "text-emerald-600 hover:underline"}`}>
                      {m.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
