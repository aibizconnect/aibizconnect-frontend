"use server";

import { startProductPurchase } from "@/lib/server/store";

/** Public storefront purchase (D-350) — anonymous customers; Stripe collects the email. */
export async function purchaseProduct(tenantId: string, productId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  return startProductPurchase(tenantId, productId);
}
