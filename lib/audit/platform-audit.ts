import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Append a platform-level audit entry. Best-effort: never throws, so an audit failure can
 * never break the action being audited. Writes to `platform_audit_log` (migration 0028).
 */
export async function logPlatformEvent(entry: {
  action: string;
  actorEmail?: string | null;
  targetEmail?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("platform_audit_log").insert({
      action: entry.action,
      actor_email: entry.actorEmail ?? null,
      target_email: entry.targetEmail ?? null,
      meta: entry.meta ?? {},
    });
  } catch {
    /* audit is best-effort; swallow */
  }
}

export interface PlatformAuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  target_email: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

/** Most-recent platform audit entries (newest first). */
export async function listPlatformAudit(limit = 100): Promise<PlatformAuditEntry[]> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("platform_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as PlatformAuditEntry[];
  } catch {
    return [];
  }
}
