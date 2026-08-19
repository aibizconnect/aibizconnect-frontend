"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { startAddonCheckout, cancelAddon } from "@/lib/marketplace/checkout";
import { updatePurchaseConfig } from "@/lib/marketplace/entitlements";

export async function startAddonCheckoutAction(tenantId: string, itemKey: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  await requireTenantAccess(tenantId);
  return startAddonCheckout(tenantId, itemKey);
}

export async function cancelAddonAction(tenantId: string, itemKey: string): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return cancelAddon(tenantId, itemKey);
}

export async function saveAddonConfigAction(tenantId: string, itemKey: string, patch: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return updatePurchaseConfig(tenantId, itemKey, patch);
}
