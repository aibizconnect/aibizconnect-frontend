"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { getStoreConfig, setStoreConfig, listStoreProducts, listOrders, type StoreConfig, type StoreOrder } from "@/lib/server/store";
import { stripeReady } from "@/lib/server/payments";
import type { Product } from "@/lib/server/billing";

/** Store admin actions (D-350). Products themselves are managed in Payments. */

export async function getStoreAdminAction(tenantId: string): Promise<{ config: StoreConfig; products: Product[]; orders: StoreOrder[]; stripeReady: boolean }> {
  await requireTenantAccess(tenantId);
  const [config, products, orders, sr] = await Promise.all([
    getStoreConfig(tenantId), listStoreProducts(tenantId), listOrders(tenantId), stripeReady(tenantId).catch(() => false),
  ]);
  return { config, products, orders, stripeReady: sr };
}

export async function setStoreConfigAction(tenantId: string, patch: { enabled?: boolean; title?: string }): Promise<StoreConfig> {
  await requireTenantAccess(tenantId);
  await setStoreConfig(tenantId, patch);
  return getStoreConfig(tenantId);
}
