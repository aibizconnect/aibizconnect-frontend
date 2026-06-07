"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Tenant-facing Audit Log (read-only). Reads the shared platform_audit_log scoped to this tenant via
 * meta->>'tenantId'. Tenant members can see who changed what in their workspace. No writes here.
 */

export interface TenantAuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export async function listTenantAudit(tenantId: string, limit = 100): Promise<TenantAuditEntry[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("platform_audit_log")
    .select("id, action, actor_email, meta, created_at")
    .eq("meta->>tenantId", tenantId)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 200));
  return (data as TenantAuditEntry[] | null) ?? [];
}
