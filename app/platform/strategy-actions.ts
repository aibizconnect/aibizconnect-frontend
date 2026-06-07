"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateStrategyCore } from "@/lib/server/content-strategy";

/**
 * Platform bulk Content Strategy generation (architect D-078/RULING 78). Generates a deterministic
 * strategy for EVERY tenant — "good strategies for all tenants." Admin-gated; each generation is
 * audited via the core. Safe to re-run (UPSERT overwrites).
 */

async function requireAdmin(): Promise<string> {
  const { isPlatformAdmin, getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Admin only.");
  return (await getCurrentUserEmail()) ?? "platform_admin";
}

export async function bulkGenerateStrategies(): Promise<{ ok: boolean; generated: number; failed: number; message?: string }> {
  let actor: string;
  try { actor = await requireAdmin(); } catch (e: any) { return { ok: false, generated: 0, failed: 0, message: e?.message }; }

  const supabase = createSupabaseServiceClient();
  const { data: tenants, error } = await supabase.from("tenants").select("id").limit(5000);
  if (error) return { ok: false, generated: 0, failed: 0, message: error.message };

  let generated = 0, failed = 0;
  for (const t of (tenants ?? []) as { id: string }[]) {
    const r = await generateStrategyCore(t.id, actor);
    if (r.ok) generated++; else failed++;
  }
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "content_strategy.bulk_generate", actorEmail: actor, meta: { generated, failed } });
  } catch { /* best effort */ }
  return { ok: true, generated, failed };
}
