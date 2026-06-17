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

  // 3) no workspace → caller routes to onboarding
  return null;
}
