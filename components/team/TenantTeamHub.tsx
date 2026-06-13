"use client";

import { useState } from "react";
import {
  inviteMemberAction, updateMemberAction, removeMemberAction, createOrganizationAction,
  type TeamView,
} from "@/app/tenants/[tenantId]/team/team-actions";
import type { TeamMember, TenantRole } from "@/lib/server/tenant-team";
import { confirmDialog, notify } from "@/lib/ui/dialogs";

/**
 * Tenant TEAM hub (D-282/283): manage your staff (roles, assigned-only access, invites)
 * and — for franchises — group locations under an organization with roll-up. Owner/admin
 * only for changes; everyone on the team can view.
 */

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const ROLE_LABEL: Record<TenantRole, string> = { owner: "Owner", admin: "Admin", member: "Member" };
const ROLE_DESC: Record<TenantRole, string> = {
  owner: "Full control, billing, can't be removed.",
  admin: "Manage team, settings, and all data.",
  member: "Works in the app; limit to assigned data below.",
};

export default function TenantTeamHub({ tenantId, initial }: { tenantId: string; initial: TeamView }) {
  const [tab, setTab] = useState<"members" | "locations">("members");
  const [view, setView] = useState(initial);
  const { canManage } = view;

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team</h1>
      <p className="mt-1 text-sm text-slate-500">Your staff and their access. For multi-location businesses and franchises, group locations under an organization with roll-up reporting.</p>
      {!canManage && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">You can view the team. Only the owner or an admin can make changes.</div>}

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {tabBtn("members", "Members")}
        {tabBtn("locations", "Locations & Franchise")}
      </div>

      {tab === "members" && <MembersTab tenantId={tenantId} view={view} setView={setView} />}
      {tab === "locations" && <LocationsTab tenantId={tenantId} view={view} setView={setView} />}
    </div>
  );
}

function MembersTab({ tenantId, view, setView }: { tenantId: string; view: TeamView; setView: (v: TeamView) => void }) {
  const { canManage } = view;
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", role: "member" as TenantRole, assignedOnly: false });
  const [busy, setBusy] = useState(false);

  const refresh = (members: TeamMember[]) => setView({ ...view, members });

  const invite = async () => {
    setBusy(true);
    const r = await inviteMemberAction(tenantId, form);
    setBusy(false);
    if (r.ok) {
      setView({ ...view, members: [...view.members, { id: crypto.randomUUID(), email: form.email.toLowerCase(), name: form.name || null, role: form.role, status: "invited", assignedOnly: form.assignedOnly, userId: null, createdAt: new Date().toISOString() }] });
      setInviting(false); setForm({ email: "", name: "", role: "member", assignedOnly: false });
      notify("Invitation recorded. They get access when they sign up with this email.");
    } else notify(r.message ?? "Could not invite.");
  };

  const setRole = async (m: TeamMember, role: TenantRole) => {
    const r = await updateMemberAction(tenantId, m.id, { role });
    if (r.ok) refresh(view.members.map((x) => (x.id === m.id ? { ...x, role } : x)));
    else notify(r.message ?? "Could not update.");
  };
  const setAssigned = async (m: TeamMember, assignedOnly: boolean) => {
    const r = await updateMemberAction(tenantId, m.id, { assignedOnly });
    if (r.ok) refresh(view.members.map((x) => (x.id === m.id ? { ...x, assignedOnly } : x)));
    else notify(r.message ?? "Could not update.");
  };
  const remove = async (m: TeamMember) => {
    if (!(await confirmDialog(`Remove ${m.email ?? m.name ?? "this member"} from the team?`))) return;
    const r = await removeMemberAction(tenantId, m.id);
    if (r.ok) refresh(view.members.filter((x) => x.id !== m.id));
    else notify(r.message ?? "Could not remove.");
  };

  return (
    <div className="mt-5 space-y-3">
      {canManage && !inviting && (
        <button onClick={() => setInviting(true)} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ Invite member</button>
      )}
      {canManage && inviting && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label><span className={lbl}>Email</span><input className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="staff@business.com" /></label>
            <label><span className={lbl}>Name (optional)</span><input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label><span className={lbl}>Role</span>
              <select className={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as TenantRole })}>
                <option value="admin">Admin</option><option value="member">Member</option>
              </select></label>
            <label className="flex items-end gap-2 pb-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.assignedOnly} onChange={(e) => setForm({ ...form, assignedOnly: e.target.checked })} /> Only assigned data
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={invite} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Inviting…" : "Send invite"}</button>
            <button onClick={() => setInviting(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {view.members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{m.name || m.email || "Member"}</span>
                {m.status === "invited" && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Invited</span>}
              </div>
              {m.email && m.name && <div className="text-xs text-slate-500">{m.email}</div>}
            </div>
            <div className="flex items-center gap-2">
              {m.role === "owner" || !canManage ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{ROLE_LABEL[m.role]}</span>
              ) : (
                <>
                  <select value={m.role} onChange={(e) => setRole(m, e.target.value as TenantRole)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs" title={ROLE_DESC[m.role]}>
                    <option value="admin">Admin</option><option value="member">Member</option>
                  </select>
                  {m.role === "member" && (
                    <label className="flex items-center gap-1 text-[11px] text-slate-500" title="Restrict to contacts/calendars assigned to them">
                      <input type="checkbox" checked={m.assignedOnly} onChange={(e) => setAssigned(m, e.target.checked)} /> assigned only
                    </label>
                  )}
                  <button onClick={() => remove(m)} className="px-1.5 text-slate-400 hover:text-red-600" title="Remove">✕</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationsTab({ tenantId, view, setView }: { tenantId: string; view: TeamView; setView: (v: TeamView) => void }) {
  const { org, rollup, canManage } = view;
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);

  const createOrg = async () => {
    setBusy(true);
    const r = await createOrganizationAction(tenantId, orgName);
    setBusy(false);
    if (r.ok) notify("Organization created — reload to manage locations."); else notify(r.message ?? "Could not create.");
  };

  if (!org) {
    return (
      <div className="mt-5 max-w-xl">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800">Run multiple locations or a franchise?</h2>
          <p className="mt-1 text-sm text-slate-500">Group your locations under one organization. Each location keeps its own workspace, contacts, calendars and website — fully isolated — while HQ gets combined roll-up reporting and a location switcher. This is how franchises stay compliant and clean.</p>
          {canManage ? (
            <div className="mt-4 flex gap-2">
              <input className={inp} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Ali Realty Group" />
              <button onClick={createOrg} disabled={busy || !orgName.trim()} className="shrink-0 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Creating…" : "Create organization"}</button>
            </div>
          ) : <p className="mt-3 text-xs text-slate-400">Only the owner or an admin can set this up.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-400">Organization</div>
        <div className="text-lg font-semibold text-slate-900">{org.name}</div>
      </div>
      {rollup && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Locations", rollup.locations], ["Contacts", rollup.contacts], ["Websites", rollup.websites], ["Appointments", rollup.appointments]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-xs text-slate-400">{k}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{v as number}</div>
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Locations</div>
        {org.locations.map((l) => (
          <a key={l.tenantId} href={`/tenants/${l.tenantId}/dashboard`} className="flex items-center justify-between border-b border-slate-100 p-3 text-sm last:border-0 hover:bg-slate-50">
            <span><span className="font-medium text-slate-900">{l.label || l.name}</span>{l.label && <span className="ml-2 text-xs text-slate-400">{l.name}</span>}</span>
            <span className="text-xs text-[#1e3a8a]">Open →</span>
          </a>
        ))}
      </div>
      <p className="text-xs text-slate-400">To add a location, create its workspace, then attach it here (platform-admin step for now — each location is a full, isolated workspace).</p>
    </div>
  );
}
