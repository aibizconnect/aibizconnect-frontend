import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Marketplace entitlements — reads over marketplace_purchases. Access to a purchased
 * add-on is a row-existence grant: an `active`, not-expired row = access. Every function
 * degrades gracefully (returns empty/false) until the 0085 DDL is applied. Tenant scoping
 * is enforced in code (.eq("tenant_id", …)), matching the app's service-role posture.
 */

const svc = () => createSupabaseServiceClient();

export interface AddonPurchase {
  itemKey: string;
  status: string;
  billingInterval: string | null;
  amountCents: number;
  currency: string;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

function mapRow(r: any): AddonPurchase {
  return {
    itemKey: r.item_key,
    status: r.status,
    billingInterval: r.billing_interval ?? null,
    amountCents: r.amount_cents ?? 0,
    currency: r.currency ?? "USD",
    stripeSubscriptionId: r.stripe_subscription_id ?? null,
    currentPeriodEnd: r.current_period_end ?? null,
    canceledAt: r.canceled_at ?? null,
    config: (r.config as Record<string, unknown>) ?? {},
    createdAt: r.created_at,
  };
}

/** All add-on rows for a tenant (any status), newest first. */
export async function listPurchases(tenantId: string): Promise<AddonPurchase[]> {
  try {
    const { data, error } = await svc()
      .from("marketplace_purchases")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

export async function getPurchase(tenantId: string, itemKey: string): Promise<AddonPurchase | null> {
  try {
    const { data, error } = await svc()
      .from("marketplace_purchases")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("item_key", itemKey)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  } catch {
    return null;
  }
}

/** The access check: an `active`, not-past-period-end row for this add-on. Fail-safe false. */
export async function hasActiveAddon(tenantId: string, itemKey: string): Promise<boolean> {
  try {
    const { data, error } = await svc()
      .from("marketplace_purchases")
      .select("status, current_period_end")
      .eq("tenant_id", tenantId)
      .eq("item_key", itemKey)
      .maybeSingle();
    if (error || !data || data.status !== "active") return false;
    if (data.current_period_end && new Date(data.current_period_end).getTime() < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

/** Merge-patch the tenant-managed config blob for an add-on. */
export async function updatePurchaseConfig(
  tenantId: string,
  itemKey: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const current = await getPurchase(tenantId, itemKey);
    if (!current) return { ok: false, error: "You don't have this add-on." };
    const config = { ...current.config, ...patch };
    const { error } = await svc()
      .from("marketplace_purchases")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("item_key", itemKey);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
