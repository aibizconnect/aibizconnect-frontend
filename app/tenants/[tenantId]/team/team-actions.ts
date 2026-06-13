"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { isPlatformAdmin, getCurrentUserEmail } from "@/lib/auth/platform-admin";
import {
  listTeam, inviteMember, updateMember, removeMember, tenantRole,
  type TeamMember, type TenantRole,
} from "@/lib/server/tenant-team";
import {
  getOrgForTenant, createOrganization, addLocation, getOrgRollup,
  type OrgSummary, type OrgRollup,
} from "@/lib/server/organizations";

/**
 * Team + Franchise actions (D-282/283). Reads need tenant access; mutations need
 * owner/admin on the tenant (or platform admin). The franchise/org features sit under
 * the same guard.
 */

async function requireManager(tenantId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (await isPlatformAdmin()) return { ok: true };
  const role = await tenantRole(tenantId, await getCurrentUserEmail());
  return role === "owner" || role === "admin" ? { ok: true } : { ok: false, message: "Only the owner or an admin can manage the team." };
}

export interface TeamView { members: TeamMember[]; canManage: boolean; org: OrgSummary | null; rollup: OrgRollup | null }

export async function getTeamViewAction(tenantId: string): Promise<TeamView> {
  await requireTenantAccess(tenantId);
  const [members, manager, org] = await Promise.all([listTeam(tenantId), requireManager(tenantId), getOrgForTenant(tenantId)]);
  const rollup = org ? await getOrgRollup(org.id) : null;
  return { members, canManage: manager.ok, org, rollup };
}

export async function inviteMemberAction(tenantId: string, input: { email: string; name?: string; role: TenantRole; assignedOnly?: boolean }): Promise<{ ok: boolean; message?: string }> {
  const g = await requireManager(tenantId);
  if (!g.ok) return { ok: false, message: g.message };
  const r = await inviteMember(tenantId, input);
  return { ok: r.ok, message: r.error };
}

export async function updateMemberAction(tenantId: string, id: string, patch: { role?: TenantRole; assignedOnly?: boolean }): Promise<{ ok: boolean; message?: string }> {
  const g = await requireManager(tenantId);
  if (!g.ok) return { ok: false, message: g.message };
  const r = await updateMember(tenantId, id, patch);
  return { ok: r.ok, message: r.error };
}

export async function removeMemberAction(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  const g = await requireManager(tenantId);
  if (!g.ok) return { ok: false, message: g.message };
  const r = await removeMember(tenantId, id);
  return { ok: r.ok, message: r.error };
}

// ── Franchise / organization ─────────────────────────────────────────────────
export async function createOrganizationAction(tenantId: string, name: string): Promise<{ ok: boolean; message?: string }> {
  const g = await requireManager(tenantId);
  if (!g.ok) return { ok: false, message: g.message };
  const r = await createOrganization(tenantId, name);
  return { ok: r.ok, message: r.error };
}

export async function addLocationAction(tenantId: string, locationTenantId: string, label?: string): Promise<{ ok: boolean; message?: string }> {
  const g = await requireManager(tenantId);
  if (!g.ok) return { ok: false, message: g.message };
  const org = await getOrgForTenant(tenantId);
  if (!org) return { ok: false, message: "Create the organization first." };
  // The location tenant must be one the caller can also manage (platform admin in practice).
  if (!(await isPlatformAdmin())) return { ok: false, message: "Adding locations is a platform-admin action for now (each location is its own workspace)." };
  const r = await addLocation(org.id, locationTenantId, label);
  return { ok: r.ok, message: r.error };
}
