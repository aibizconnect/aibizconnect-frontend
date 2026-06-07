import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Resolve the workspace (tenant) to land a signed-in user in. Until per-user tenant
 * membership is wired from the external backend, we use: DEFAULT_TENANT_ID env override,
 * else the most recent tenant seen in `websites`. Returns null if none can be resolved.
 * Server-side only; never throws.
 */
export async function resolveDefaultTenantId(): Promise<string | null> {
  const env = process.env.DEFAULT_TENANT_ID || process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
  if (env) return env;
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase.from("websites").select("tenant_id").limit(1);
    return data?.[0]?.tenant_id ?? null;
  } catch {
    return null;
  }
}
