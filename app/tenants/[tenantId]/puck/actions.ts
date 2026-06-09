"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/** Load the saved Puck page for a tenant (null if none saved yet). */
export async function loadPuckPage(tenantId: string, slug = "home"): Promise<any | null> {
  await requireTenantAccess(tenantId);
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("website_puck_pages").select("data").eq("tenant_id", tenantId).eq("slug", slug).maybeSingle();
  if (error) return null; // table may not exist yet → fall back to default
  return data?.data ?? null;
}

/** Save/publish the Puck page JSON for a tenant. */
export async function savePuckPage(tenantId: string, slug: string, payload: any): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("website_puck_pages").upsert(
    { tenant_id: tenantId, slug: slug || "home", data: payload, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,slug" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
