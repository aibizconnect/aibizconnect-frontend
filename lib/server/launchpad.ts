import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Server-only Launchpad step registry + verifiers (NOT "use server" → not client-callable).
 * Steps are DATA: add a new step to STEP_REGISTRY and it appears on the Launchpad — no change to the
 * generic getLaunchpadState loop (LP-V15, extensible). Each step's verify() reuses the same
 * persistence checks the rest of the app already writes, so completion is detected automatically.
 */

export type StepStatus = "pending" | "in_progress" | "complete" | "skipped" | "not_applicable";

export interface StepVerifyResult { complete: boolean; status?: StepStatus; evidence?: Record<string, unknown> }
export interface StepContext { tenantId: string; websiteId: string | null }

export interface StepDef {
  key: string;
  title: string;
  desc: string;
  category: "core" | "growth" | "commerce";
  optional: boolean;
  /** Where the tenant goes to finish this step. */
  route: (tenantId: string, websiteId: string | null) => string;
  /** Live check. Absent → step is purely manual (never auto-completes). */
  verify?: (ctx: StepContext) => Promise<StepVerifyResult>;
}

const DEFAULT_BRAND_PRIMARY = "#1e3a8a"; // migration 0031 default — used to detect customization

export const STEP_REGISTRY: StepDef[] = [
  {
    key: "account", title: "Complete your business profile", category: "core", optional: false,
    desc: "Set your timezone and currency so dates, schedules, and pricing are right.",
    route: (t) => `/tenants/${t}/settings?tab=preferences`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", ["default_timezone", "currency"]);
      const keys = new Set((data ?? []).filter((r: any) => r.setting_value && String(r.setting_value).trim() !== "").map((r: any) => r.setting_key));
      return { complete: keys.has("default_timezone") && keys.has("currency"), evidence: { set: [...keys] } };
    },
  },
  {
    key: "brand", title: "Set your brand", category: "core", optional: false,
    desc: "Add your logo and choose colors and fonts so your site looks like you.",
    route: (t, w) => w ? `/tenants/${t}/website/${w}` : `/tenants/${t}/website`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("website_brand_settings").select("logo_url, color_palette").eq("tenant_id", tenantId);
      const rows = (data ?? []) as any[];
      const hasLogo = rows.some((r) => r.logo_url && String(r.logo_url).trim() !== "");
      const customized = rows.some((r) => r?.color_palette?.primary && r.color_palette.primary.toLowerCase() !== DEFAULT_BRAND_PRIMARY);
      return { complete: hasLogo || customized, evidence: { hasLogo, customized } };
    },
  },
  {
    key: "website", title: "Build & publish your website", category: "core", optional: false,
    desc: "Create your site with the AI builder and publish at least one page.",
    route: (t) => `/tenants/${t}/website`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { count } = await supabase.from("website_pages").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_public", true);
      return { complete: (count ?? 0) >= 1, evidence: { publishedPages: count ?? 0 } };
    },
  },
  {
    key: "domain", title: "Connect your domain", category: "growth", optional: false,
    desc: "Point your custom domain to your site and verify it.",
    route: (t, w) => w ? `/tenants/${t}/website/${w}?tab=settings` : `/tenants/${t}/website`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("tenant_domains").select("domain_name, status").eq("tenant_id", tenantId).in("status", ["verified", "active"]).limit(1);
      const row = (data ?? [])[0] as any;
      return { complete: !!row, evidence: row ? { domain: row.domain_name, status: row.status } : {} };
    },
  },
  {
    key: "email", title: "Set up email sending", category: "growth", optional: false,
    desc: "Send from your own domain — add your ESP key and verify SPF/DKIM/DMARC.",
    route: (t, w) => w ? `/tenants/${t}/website/${w}?tab=settings` : `/tenants/${t}/website`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("tenant_email_settings").select("sender_email, status").eq("tenant_id", tenantId).eq("status", "verified").limit(1);
      const row = (data ?? [])[0] as any;
      return { complete: !!row, evidence: row ? { sender: row.sender_email } : {} };
    },
  },
  {
    key: "social", title: "Connect your social accounts", category: "growth", optional: false,
    desc: "Link Facebook, Instagram, LinkedIn, YouTube and more — connect once, use everywhere.",
    route: (t) => `/tenants/${t}/settings`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { count } = await supabase.from("tenant_social_accounts").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
      return { complete: (count ?? 0) >= 1, evidence: { accounts: count ?? 0 } };
    },
  },
  {
    key: "ecommerce", title: "Connect your store (optional)", category: "commerce", optional: true,
    desc: "Sync products and orders from Shopify.",
    route: (t) => `/tenants/${t}/settings`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("tenant_integrations").select("status").eq("tenant_id", tenantId).eq("provider", "shopify").maybeSingle();
      return { complete: (data as any)?.status === "connected", evidence: { status: (data as any)?.status ?? "disconnected" } };
    },
  },
  {
    key: "idx_vow", title: "Connect IDX / VOW listings (optional)", category: "commerce", optional: true,
    desc: "Bring in MLS listings via your IDX/VOW feed (real estate).",
    route: (t) => `/tenants/${t}/settings`,
    verify: async ({ tenantId }) => {
      const supabase = createSupabaseServiceClient();
      const { data } = await supabase.from("tenant_integrations").select("status").eq("tenant_id", tenantId).eq("provider", "idx_vow").maybeSingle();
      const status = (data as any)?.status;
      // No backend yet → not_applicable rather than blocking incomplete.
      if (status === "connected") return { complete: true, status: "complete", evidence: { status } };
      return { complete: false, status: "not_applicable", evidence: { status: status ?? "unavailable" } };
    },
  },
];

export function getStep(key: string): StepDef | undefined {
  return STEP_REGISTRY.find((s) => s.key === key);
}

/** The tenant's primary website id (or first), used as context for website-scoped checks. */
export async function primaryWebsiteId(tenantId: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("websites").select("id, is_primary, created_at").eq("tenant_id", tenantId).order("is_primary", { ascending: false }).order("created_at", { ascending: true }).limit(1);
  return (data ?? [])[0]?.id ?? null;
}
