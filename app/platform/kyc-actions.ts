"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { applyPlatformDecisionCore, type KycStatus } from "@/lib/server/kyc";

/**
 * Platform-side KYC review (admin/superadmin only). Lists verification cases (NON-PII summaries) and
 * records approve / reject / override decisions, audited. No PII is ever read or shown — only status,
 * provider session reference, and the non-PII decision summary stored on the row.
 */

async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Admin only.");
}

export interface KycCaseView {
  tenant_id: string;
  status: KycStatus;
  provider: string;
  provider_session_id: string | null;
  provider_decision: Record<string, unknown>;
  provider_risk_level: string | null;
  provider_reason: string | null;
  platform_decision: string | null;
  platform_reason: string | null;
  platform_reviewer_id: string | null;
  platform_reviewed_at: string | null;
  updated_at: string;
}

/**
 * List KYC cases. By default surfaces those needing attention (provider_verified / provider_rejected
 * / provider_in_progress); pass all=true for the full list.
 */
export async function listKycCases(opts?: { all?: boolean }): Promise<KycCaseView[]> {
  await requireAdmin();
  const supabase = createSupabaseServiceClient();
  let q = supabase
    .from("tenant_kyc")
    .select("tenant_id, status, provider, provider_session_id, provider_decision, provider_risk_level, provider_reason, platform_decision, platform_reason, platform_reviewer_id, platform_reviewed_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (!opts?.all) q = q.in("status", ["provider_verified", "provider_rejected", "provider_in_progress"]);
  const { data } = await q;
  return (data as KycCaseView[] | null) ?? [];
}

export async function reviewKycDecision(
  tenantId: string,
  decision: "approved" | "rejected" | "overridden",
  reason: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  const reviewer = (await getCurrentUserEmail()) ?? "platform_admin";
  return applyPlatformDecisionCore(tenantId, decision, reviewer, reason);
}
