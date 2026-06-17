import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { provisionTenant, type GenesisSummary } from "./onboarding";
import { applyTemplate, type ApplyTemplateResult } from "./templates-apply";
import { industryKeyForTemplate } from "./server/industry-profiles";

/**
 * Onboarding "Generate my site" (Branch B, v1 steps 1–3 + generate). Turns a lite intake
 * (business name, email, industry template, location) into a real, pre-branded DRAFT site:
 *   1) create a soft tenant (name + slug)
 *   2) provision it (entitlement policies + free subdomain)
 *   3) apply the chosen industry template (draft pages + brand tokens)
 *
 * SAFETY (SHARED_SPEC): drafts only — nothing publishes/sends/charges. No payment. Full
 * signup is deferred to publish. Email is captured but NOT persisted to a new column (the
 * tenants.lead_source/location/email schema is QUEUED, not applied) — passed through in the
 * response so the caller can stash it once those columns land.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const slugify = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "site";

export interface OnboardingResult {
  ok: boolean;
  tenantId?: string;
  slug?: string;
  subdomain?: string | null;
  apply?: ApplyTemplateResult;
  /** Genesis report (D-380/381): the blueprint modules + customer-contact + sample listings that landed. */
  genesis?: GenesisSummary;
  previewPath?: string;
  dashboardPath?: string;
  genesisPath?: string;
  error?: string;
}

export async function startOnboarding(args: {
  businessName: string;
  email: string;
  templateKey: string;
  location?: { country?: string; region?: string; city?: string; area?: string };
  /** D-270 (Ali's law): NOTHING creates a tenant without an explicit ask. The signup UI
   *  passes true from the user's deliberate "Generate my site" action; any script, agent,
   *  or test caller without it is refused and the attempt is audited. */
  userConfirmedNewWorkspace?: boolean;
}): Promise<OnboardingResult> {
  if (args.userConfirmedNewWorkspace !== true) {
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "tenant.creation_refused", actorEmail: (args.email ?? "").trim() || null, meta: { reason: "userConfirmedNewWorkspace missing (D-270)", businessName: args.businessName } });
    } catch { /* best effort */ }
    return { ok: false, error: "Creating a new workspace requires explicit confirmation (userConfirmedNewWorkspace)." };
  }
  const businessName = (args.businessName ?? "").trim();
  const email = (args.email ?? "").trim();
  if (businessName.length < 2) return { ok: false, error: "Enter your business name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  if (!args.templateKey) return { ok: false, error: "Pick an industry." };

  const sb = service();

  // unique slug
  const base = slugify(businessName);
  let slug = base;
  for (let i = 0; i < 6; i++) {
    const { data } = await sb.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i + 2}`;
  }

  const ins = await sb.from("tenants").insert({ name: businessName, slug }).select("id").single();
  if (ins.error) return { ok: false, error: `Could not create your workspace: ${ins.error.message}` };
  const tenantId = ins.data.id as string;

  // provision (policies + free subdomain + canonical blueprint: modules, CRM customer-contact,
  // sample listings). The template key maps to the industry profile so the right modules turn on.
  const prov = await provisionTenant({
    tenantId,
    industry: industryKeyForTemplate(args.templateKey),
    ownerEmail: email,
  });

  // apply the industry template (draft pages + brand)
  const apply = await applyTemplate({ tenantId, templateKey: args.templateKey, businessName, applyBrand: true });
  if (!apply.ok) return { ok: false, tenantId, slug, error: apply.error ?? "Could not generate your site.", apply, genesis: prov.genesis };

  const firstPage = apply.pages[0];
  return {
    ok: true,
    tenantId,
    slug,
    subdomain: prov.subdomain,
    apply,
    genesis: prov.genesis,
    previewPath: firstPage?.previewPath ?? `/sites/${tenantId}/home?preview=1`,
    dashboardPath: `/tenants/${tenantId}/dashboard`,
    genesisPath: `/tenants/${tenantId}/genesis`,
  };
}
