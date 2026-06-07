"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getStrategyRecord, generateStrategyCore, type StrategyRecord } from "@/lib/server/content-strategy";

/**
 * Tenant-facing Content Strategy actions. Reads are tenant-scoped; generation (which overwrites the
 * single strategy row) is admin-gated. Deterministic — no LLM call.
 */

export async function getStrategy(tenantId: string): Promise<StrategyRecord | null> {
  await requireTenantAccess(tenantId);
  return getStrategyRecord(tenantId);
}

export async function generateStrategy(tenantId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const { isPlatformAdmin, getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) return { ok: false, message: "Not authorized — admin only." };
  const who = (await getCurrentUserEmail()) ?? "tenant_admin";
  const r = await generateStrategyCore(tenantId, who);
  return { ok: r.ok, message: r.message };
}

export type { StrategyRecord };
