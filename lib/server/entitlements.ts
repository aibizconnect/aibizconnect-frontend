import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { listPlans, getTenantUsage, type Entitlement, type TenantUsage } from "@/lib/server/subscriptions";

/**
 * Entitlement resolution + enforcement. A tenant's limits come from the plan they're on with US:
 * `tenants.plan` (e.g. 'starter') → the platform catalog `subscription_plans` row of the same name
 * → its `entitlements`. Usage is measured by getTenantUsage. Phase 2 of [[plan-entitlements]].
 *
 * EVERYTHING here is fail-safe: any lookup error resolves to "allowed / no limit", so a billing
 * bug can never block a tenant from using the product.
 */

const PLATFORM_TENANT_ID = "d723a086-eac0-4b61-8742-25313370d0b7";

/** Maps an entitlement key to the usage field that meters it (custom keys have no meter). */
const USAGE_FIELD: Record<string, keyof TenantUsage> = {
  contacts: "contacts", seats: "seats", ai_credits: "ai_credits", websites: "websites",
};

/** The entitlements that apply to a tenant (from its plan on the platform catalog). */
export async function getEntitlementsForTenant(tenantId: string): Promise<Entitlement[]> {
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenants").select("plan").eq("id", tenantId).maybeSingle();
    const plan = (data?.plan ?? "").toString().trim().toLowerCase();
    if (!plan || plan === "free") return [];
    const catalog = await listPlans(PLATFORM_TENANT_ID);
    const match = catalog.find((p) => p.name.toLowerCase() === plan);
    return match?.entitlements ?? [];
  } catch { return []; }
}

export interface UsageStatusItem {
  key: string; label: string; unit: string; used: number; included: number;
  enforce: Entitlement["enforce"]; over: boolean; remaining: number | null; // null = unmetered/unlimited
}

/** Usage vs entitlement for each metered limit on the tenant's plan. */
export async function getUsageStatus(tenantId: string): Promise<UsageStatusItem[]> {
  try {
    const [ents, usage] = await Promise.all([getEntitlementsForTenant(tenantId), getTenantUsage(tenantId)]);
    return ents.map((e) => {
      const field = USAGE_FIELD[e.key];
      const metered = !!field;
      const used = metered ? usage[field] : 0;
      const unlimited = e.included <= 0; // 0/negative included ⇒ treat as unlimited
      return {
        key: e.key, label: e.label, unit: e.unit, used, included: e.included, enforce: e.enforce,
        over: metered && !unlimited && used > e.included,
        remaining: !metered || unlimited ? null : Math.max(0, e.included - used),
      };
    });
  } catch { return []; }
}

const METERED: { key: string; label: string; unit: string }[] = [
  { key: "contacts", label: "Contacts", unit: "contacts" },
  { key: "seats", label: "Seats", unit: "seats" },
  { key: "ai_credits", label: "AI", unit: "credits" },
  { key: "websites", label: "Sites", unit: "sites" },
];

/**
 * Always returns the 4 metered features with current usage; `included` is the plan limit (0 = no
 * limit set, just show the count). For the platform Subscribers console "who's over" readout.
 */
export async function getUsageOverview(tenantId: string): Promise<UsageStatusItem[]> {
  try {
    const [ents, usage] = await Promise.all([getEntitlementsForTenant(tenantId), getTenantUsage(tenantId)]);
    const byKey = new Map(ents.map((e) => [e.key, e]));
    return METERED.map((m) => {
      const e = byKey.get(m.key);
      const included = e && e.included > 0 ? e.included : 0;
      const used = usage[USAGE_FIELD[m.key]];
      return {
        key: m.key, label: m.label, unit: m.unit, used, included,
        enforce: e?.enforce ?? "off", over: included > 0 && used > included,
        remaining: included > 0 ? Math.max(0, included - used) : null,
      };
    });
  } catch { return []; }
}

export interface LimitCheck { ok: boolean; blocked?: boolean; message?: string }

/**
 * Gate a create action against a hard ('block') limit. Returns ok:true unless the feature is
 * explicitly 'block' AND the tenant is at/over the included quantity. Never throws.
 * (delta = how many you're about to add; default 1.)
 */
export async function assertWithinLimit(tenantId: string, key: string, delta = 1): Promise<LimitCheck> {
  try {
    const ents = await getEntitlementsForTenant(tenantId);
    const ent = ents.find((e) => e.key === key);
    if (!ent || ent.enforce !== "block" || ent.included <= 0) return { ok: true };
    const field = USAGE_FIELD[key];
    if (!field) return { ok: true };
    const usage = await getTenantUsage(tenantId);
    if (usage[field] + delta > ent.included) {
      return { ok: false, blocked: true, message: `You've reached your plan's ${ent.label.toLowerCase()} limit (${ent.included} ${ent.unit}). Upgrade your plan or add an add-on to add more.` };
    }
    return { ok: true };
  } catch { return { ok: true }; }
}
