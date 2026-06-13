import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Tenant TEAM management (D-282) — the tenant-facing Team menu (was a superadmin-only
 * console). Members live in tenant_users (role owner/admin/member, status active/invited,
 * assigned_only = GHL "only assigned data"). Graceful before 0056: if the email/name/
 * assigned_only columns are missing we degrade to what exists (role + status only).
 */

export type TenantRole = "owner" | "admin" | "member";
export interface TeamMember {
  id: string;
  email: string | null;
  name: string | null;
  role: TenantRole;
  status: "active" | "invited";
  assignedOnly: boolean;
  userId: string | null;
  createdAt: string;
}

const svc = () => createSupabaseServiceClient();
const isMissingCol = (msg?: string) => /column .* does not exist|could not find the .* column/i.test(msg ?? "");

const shape = (r: any): TeamMember => ({
  id: r.id,
  email: r.email ?? null,
  name: r.name ?? null,
  role: (["owner", "admin", "member"].includes(r.role) ? r.role : "member") as TenantRole,
  status: r.status === "invited" ? "invited" : "active",
  assignedOnly: !!r.assigned_only,
  userId: r.user_id ?? null,
  createdAt: r.created_at ?? "",
});

export async function listTeam(tenantId: string): Promise<TeamMember[]> {
  const sb = svc();
  let res: { data: any[] | null; error: { message: string } | null } =
    await sb.from("tenant_users").select("id, email, name, role, status, assigned_only, user_id, created_at").eq("tenant_id", tenantId).order("created_at");
  if (res.error && isMissingCol(res.error.message)) {
    res = await sb.from("tenant_users").select("id, role, status, user_id, created_at").eq("tenant_id", tenantId).order("created_at");
  }
  return (res.data ?? []).map(shape);
}

/** This caller's role on a tenant (by email match on an active member). null = no access. */
export async function tenantRole(tenantId: string, email: string | null): Promise<TenantRole | null> {
  if (!email) return null;
  const sb = svc();
  const res = await sb.from("tenant_users").select("role, status").eq("tenant_id", tenantId).ilike("email", email).maybeSingle();
  if (res.error || !res.data) return null;
  if ((res.data as any).status === "invited") return null;
  return (res.data as any).role as TenantRole;
}

export async function inviteMember(tenantId: string, input: { email: string; name?: string; role: TenantRole; assignedOnly?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  if (input.role === "owner") return { ok: false, error: "There can only be one owner — assign Admin instead." };
  const sb = svc();
  const { data: existing } = await sb.from("tenant_users").select("id").eq("tenant_id", tenantId).ilike("email", email).maybeSingle();
  if (existing) return { ok: false, error: "That person is already on the team." };
  const row: Record<string, unknown> = { tenant_id: tenantId, email, name: input.name?.trim() || null, role: input.role, status: "invited", assigned_only: !!input.assignedOnly, invited_at: new Date().toISOString() };
  const { error } = await sb.from("tenant_users").insert(row);
  if (error) {
    // Inviting a not-yet-signed-up person needs the email column + nullable user_id
    // (migration 0056). Until it's applied, surface a clear, friendly message rather
    // than a raw constraint error — existing members can still be managed.
    if (isMissingCol(error.message) || /user_id.*not-null|null value in column "user_id"/i.test(error.message)) {
      return { ok: false, error: "Inviting new members needs a quick database update (migration 0056) — managing your existing team works now." };
    }
    return { ok: false, error: error.message };
  }
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "team.invite", actorEmail: null, meta: { tenantId, email, role: input.role } });
  } catch { /* best effort */ }
  return { ok: true };
}

export async function updateMember(tenantId: string, id: string, patch: { role?: TenantRole; assignedOnly?: boolean }): Promise<{ ok: boolean; error?: string }> {
  const sb = svc();
  // Never demote the sole owner.
  if (patch.role && patch.role !== "owner") {
    const { data: m } = await sb.from("tenant_users").select("role").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if ((m as any)?.role === "owner") return { ok: false, error: "The owner role can't be changed here." };
  }
  const upd: Record<string, unknown> = {};
  if (patch.role) upd.role = patch.role;
  if (patch.assignedOnly != null) upd.assigned_only = patch.assignedOnly;
  if (!Object.keys(upd).length) return { ok: true };
  let { error } = await sb.from("tenant_users").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error && isMissingCol(error.message) && patch.role) ({ error } = await sb.from("tenant_users").update({ role: patch.role }).eq("tenant_id", tenantId).eq("id", id));
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function removeMember(tenantId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = svc();
  const { data: m } = await sb.from("tenant_users").select("role").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if ((m as any)?.role === "owner") return { ok: false, error: "You can't remove the owner." };
  const { error } = await sb.from("tenant_users").delete().eq("tenant_id", tenantId).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
