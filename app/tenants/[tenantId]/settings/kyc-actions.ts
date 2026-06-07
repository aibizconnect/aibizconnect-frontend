"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getKycStatus, startKycCore, kycProviderReady, type KycStatusView } from "@/lib/server/kyc";

/**
 * Tenant-facing KYC actions. Reads return a NON-PII status view only; the actual identity check
 * happens entirely in the provider's hosted flow. No government IDs / documents are ever handled here.
 */

export interface KycView extends KycStatusView {
  providerReady: boolean;
}

export async function getKycView(tenantId: string): Promise<KycView> {
  await requireTenantAccess(tenantId);
  const [status, providerReady] = await Promise.all([getKycStatus(tenantId), kycProviderReady()]);
  return { ...status, providerReady };
}

/** Start (or restart) a hosted verification session; returns the provider URL to complete it. */
export async function startKycVerification(tenantId: string): Promise<{ ok: boolean; url?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  const who = (await getCurrentUserEmail()) ?? "tenant_user";
  return startKycCore(tenantId, who);
}
