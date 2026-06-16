import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Platform admin directory (D-375) — read + manage ALL tenants and ALL users.
 * Distinct from lib/auth/team.ts (which is only the AI Biz Connect TEAM). Every caller must be
 * gated by isPlatformAdmin() at the server-action layer. Service-role only; never exposed to tenants.
 */

/** The real platform tenant — never deletable from any surface. */
export const PROTECTED_TENANT_IDS = ["d723a086-eac0-4b61-8742-25313370d0b7"];

export interface AdminTenant {
  id: string; name: string; slug: string | null; plan: string | null;
  createdAt: string | null; location: string | null; isProtected: boolean;
}
export interface AdminUser {
  id: string; email: string; name: string; confirmed: boolean; banned: boolean;
  platformRole: string | null; createdAt: string | null; lastSignInAt: string | null;
}

export async function listAllTenants(): Promise<AdminTenant[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenants").select("id,name,slug,plan,created_at,location_label").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t: any) => ({
    id: t.id, name: t.name ?? "(unnamed)", slug: t.slug ?? null, plan: t.plan ?? null,
    createdAt: t.created_at ?? null, location: t.location_label ?? null,
    isProtected: PROTECTED_TENANT_IDS.includes(t.id),
  }));
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const sb = createSupabaseServiceClient();
  const out: AdminUser[] = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users as any[]) {
      const email = (u.email || "").toLowerCase();
      const meta = u.app_metadata || {};
      const bannedUntil = u.banned_until ? new Date(u.banned_until).getTime() : 0;
      out.push({
        id: u.id, email,
        name: (u.user_metadata?.full_name || u.user_metadata?.name || "").trim() || email.split("@")[0],
        confirmed: !!u.email_confirmed_at,
        banned: !!(bannedUntil && bannedUntil > Date.now()),
        platformRole: String(meta.platform_role || meta.platformRole || "") || null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 200) break;
  }
  return out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/** Hard-delete an auth user (and their Supabase identity). Memberships fall away with the tenant. */
export async function deleteUserAccount(userId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

/** Ban (deactivate) or reactivate an auth user. */
export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" } as any);
  if (error) throw new Error(error.message);
}

/** Delete a tenant and ALL its data via the cascade RPC (migration 0075). Platform tenant is refused. */
export async function deleteTenantCascade(tenantId: string): Promise<void> {
  if (PROTECTED_TENANT_IDS.includes(tenantId)) throw new Error("This is the protected platform tenant — it can't be deleted.");
  const sb = createSupabaseServiceClient();
  const { error } = await sb.rpc("delete_tenant_cascade", { p_tenant: tenantId });
  if (error) {
    if (/function .*delete_tenant_cascade/i.test(error.message)) throw new Error("Apply migration 0075_delete_tenant_cascade.sql first, then retry.");
    throw new Error(error.message);
  }
}
