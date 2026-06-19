import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth/platform-admin";

/**
 * Resolve the workspace (tenant) to land a signed-in user in. Per-user FIRST (the real flow):
 * the tenant the user is a member of via `tenant_users` (matched by user_id or email, most recent
 * active). Falls back to a DEFAULT_TENANT_ID env override (dev / single-tenant). Returns null when
 * the user has no workspace yet → the caller sends them to onboarding to create one (D-378/379).
 * Server-side only; never throws.
 */
export async function resolveDefaultTenantId(): Promise<string | null> {
  // 1) the signed-in user's OWN tenant membership
  try {
    const [uid, user] = await Promise.all([getCurrentUserId(), getCurrentUser()]);
    const email = user?.email ?? null;
    if (uid || email) {
      const sb = createSupabaseServiceClient();
      const ors: string[] = [];
      if (uid) ors.push(`user_id.eq.${uid}`);
      if (email) ors.push(`email.ilike.${email}`);
      let q = sb.from("tenant_users").select("tenant_id, status, created_at").order("created_at", { ascending: false });
      if (ors.length) q = q.or(ors.join(","));
      const { data } = await q;
      const active = (data ?? []).filter((r: any) => !r.status || r.status === "active");
      if (active[0]?.tenant_id) return active[0].tenant_id as string;
    }
  } catch { /* fall through to env */ }

  // 2) env override (dev / single-tenant convenience)
  const env = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
  if (env) return env;

  // 3) platform admins / sysadmins must never dead-end: land them in the platform (primary) tenant
  // even without an explicit membership. (ONE-TENANT: d723a086 is THE tenant.)
  try {
    const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
    if (await isPlatformAdmin()) {
      const sb = createSupabaseServiceClient();
      const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
      const { data: pinned } = await sb.from("tenants").select("id").eq("id", PLATFORM_TENANT).maybeSingle();
      if (pinned?.id) return pinned.id as string;
      const { data: first } = await sb.from("tenants").select("id").order("created_at", { ascending: true }).limit(1);
      if (first?.[0]?.id) return first[0].id as string;
    }
  } catch { /* fall through to onboarding */ }

  // 4) no workspace → caller routes to onboarding
  return null;
}
