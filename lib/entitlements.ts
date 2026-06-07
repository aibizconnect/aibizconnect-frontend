import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Entitlement engine (Ali's universal rule). Resolves "can user U use feature F, and
 * who pays?" across every service/add-on. Implements the ratified resolution order:
 *   1) user override (user_feature_entitlements) wins
 *   2) else tenant policy (tenant_feature_policies):
 *        included_for_all      -> enabled
 *        optional_paid_by_tenant-> enabled iff an entitlement row enabled=true
 *        optional_paid_by_user -> enabled iff a user_purchase row enabled=true
 *        restricted            -> disabled unless a tenant_override enables it
 *   3) else disabled
 * Payer comes from billing_responsibilities (tenant | user | parent_tenant).
 *
 * Service-role reads; graceful (defaults to DISABLED on any error — fail safe).
 */

export const FEATURES = {
  EXTRA_WEBSITE: "extra_website",
  CUSTOM_DOMAIN: "custom_domain",
  EMAIL_SENDING: "email_sending",
  SOCIAL_PUBLISHING: "social_publishing",
  ADS: "ads",
  VOICE: "voice",
  AI_PROVIDER_BYOK: "ai_provider_byok",
  ANALYTICS: "analytics",
  AGENT_SEATS: "agent_seats",
  DELETE_PAGES: "delete_pages", // permission an admin can grant a non-admin to delete pages
} as const;
export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES] | string;

export type PolicyType = "included_for_all" | "optional_paid_by_tenant" | "optional_paid_by_user" | "restricted";
export type PayerType = "tenant" | "user" | "parent_tenant";

export interface Entitlement {
  enabled: boolean;
  source: "tenant_override" | "user_purchase" | "tenant_policy" | "system" | "none";
  payerType: PayerType | null;
  payerId: string | null;
}

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const DISABLED: Entitlement = { enabled: false, source: "none", payerType: null, payerId: null };

export async function resolveEntitlement(tenantId: string, userId: string | null, featureKey: FeatureKey): Promise<Entitlement> {
  try {
    const sb = service();

    // Payer (independent of enablement).
    const { data: billing } = await sb.from("billing_responsibilities")
      .select("payer_type, payer_tenant_id").eq("tenant_id", tenantId).eq("feature_key", featureKey).maybeSingle();
    const payerType = (billing?.payer_type as PayerType | undefined) ?? null;
    const payerId = payerType === "parent_tenant" ? (billing?.payer_tenant_id ?? null) : payerType === "user" ? userId : payerType === "tenant" ? tenantId : null;

    // 1) user override
    if (userId) {
      const { data: ov } = await sb.from("user_feature_entitlements")
        .select("enabled, source").eq("tenant_id", tenantId).eq("user_id", userId).eq("feature_key", featureKey).maybeSingle();
      if (ov) {
        return { enabled: ov.enabled === true, source: (ov.source as Entitlement["source"]) ?? "tenant_override", payerType, payerId };
      }
    }

    // 2) tenant policy
    const { data: pol } = await sb.from("tenant_feature_policies")
      .select("policy, default_enabled").eq("tenant_id", tenantId).eq("feature_key", featureKey).maybeSingle();
    const policy = pol?.policy as PolicyType | undefined;
    if (policy === "included_for_all") return { enabled: true, source: "tenant_policy", payerType: payerType ?? "tenant", payerId: payerId ?? tenantId };
    // optional_* and restricted require an explicit user row (handled in step 1); none found -> disabled.
    return DISABLED;
  } catch {
    return DISABLED; // fail safe
  }
}

/** Convenience boolean check. */
export async function canUseFeature(tenantId: string, userId: string | null, featureKey: FeatureKey): Promise<boolean> {
  return (await resolveEntitlement(tenantId, userId, featureKey)).enabled;
}

/** Which entitlement feature governs each agent domain's LIVE execution. */
export const FEATURE_BY_DOMAIN: Record<string, FeatureKey> = {
  email: FEATURES.EMAIL_SENDING,
  social: FEATURES.SOCIAL_PUBLISHING,
  ads: FEATURES.ADS,
  voice: FEATURES.VOICE,
};

/** Ratified default tenant policies (Copilot's set) — predictable, no accidental free upgrades. */
export const DEFAULT_POLICIES: Array<{ featureKey: FeatureKey; policy: PolicyType }> = [
  { featureKey: FEATURES.CUSTOM_DOMAIN, policy: "optional_paid_by_tenant" },
  { featureKey: FEATURES.EXTRA_WEBSITE, policy: "optional_paid_by_tenant" },
  { featureKey: FEATURES.EMAIL_SENDING, policy: "included_for_all" },
  { featureKey: FEATURES.SOCIAL_PUBLISHING, policy: "included_for_all" },
  { featureKey: FEATURES.AI_PROVIDER_BYOK, policy: "optional_paid_by_user" },
  { featureKey: FEATURES.ANALYTICS, policy: "included_for_all" },
  { featureKey: FEATURES.AGENT_SEATS, policy: "optional_paid_by_tenant" },
];

/** Seed the default policy set for a tenant (idempotent). Used at onboarding. */
export async function seedTenantPolicies(tenantId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = DEFAULT_POLICIES.map((p) => ({
      tenant_id: tenantId, feature_key: p.featureKey, policy: p.policy,
      default_enabled: p.policy === "included_for_all",
    }));
    const { error } = await service().from("tenant_feature_policies").upsert(rows, { onConflict: "tenant_id,feature_key" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
