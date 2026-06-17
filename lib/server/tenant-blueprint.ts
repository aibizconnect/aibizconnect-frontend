import { listContacts, createContact, bulkTagContacts, ensurePipeline } from "@/lib/crm";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { profileFor, MODULES, INDUSTRY_PROFILES, type ModuleKey } from "@/lib/server/industry-profiles";

/**
 * Canonical Tenant Blueprint (D-376) — the ONE structure every tenant inherits, plus the
 * customer-lifecycle layer (D-375) where each tenant shows up as a CONTACT in ABC's own CRM.
 *
 * AI Biz Connect is tenant #1 dogfooding its own product: its CRM (the platform tenant) is where
 * we see every tenant as a customer, tagged by lifecycle (trial/client) + paid tier. Change the
 * blueprint here once → every future tenant inherits the change. No per-tenant bespoke.
 */

/** ABC's own tenant — its CRM holds the tenants-as-customers. */
export const PLATFORM_TENANT_ID = "d723a086-eac0-4b61-8742-25313370d0b7";

export type Tier = "pro" | "premium" | "enterprise";
export type Lifecycle = "trial" | "client";
export const TIERS: Tier[] = ["pro", "premium", "enterprise"];
export const TIER_LABEL: Record<Tier, string> = { pro: "Pro", premium: "Premium", enterprise: "Enterprise" };

/** Stored on the customer-contact's `source` so we can map a contact ⇄ its tenant. */
export const tenantLinkSource = (tenantId: string) => `tenant:${tenantId}`;

/**
 * Ensure ABC's CRM has a customer-contact for this tenant, tagged by lifecycle (+ tier for clients).
 * Idempotent: matches an existing contact by `source = tenant:<id>`, else creates one. This is what
 * makes a tenant "appear on our contacts list, tagged client/trial."
 */
export async function ensureCustomerContact(
  tenant: { id: string; name: string; ownerEmail?: string | null },
  lifecycle: Lifecycle = "trial",
  tier?: Tier,
): Promise<{ ok: boolean; error?: string }> {
  const src = tenantLinkSource(tenant.id);
  const existing = (await listContacts(PLATFORM_TENANT_ID)).find((c) => c.source === src);
  if (!existing) {
    const tags = [lifecycle, ...(lifecycle === "client" && tier ? [TIER_LABEL[tier]] : [])];
    return createContact(PLATFORM_TENANT_ID, { name: tenant.name, email: tenant.ownerEmail ?? undefined, source: src, tags });
  }
  // Reconcile tags: assert the current lifecycle (+ tier), drop the opposite lifecycle tag.
  await bulkTagContacts(PLATFORM_TENANT_ID, [existing.id], lifecycle, "add");
  if (lifecycle === "client" && tier) await bulkTagContacts(PLATFORM_TENANT_ID, [existing.id], TIER_LABEL[tier], "add");
  await bulkTagContacts(PLATFORM_TENANT_ID, [existing.id], lifecycle === "client" ? "trial" : "client", "remove");
  return { ok: true };
}

const svc = () => createSupabaseServiceClient();

/** A-1 (ratified): per-module outcome recorded in the Genesis Report. G1-A2: every module carries a
 *  human reason for its status (enabled / available / needs_action). `note` kept as an alias. */
export interface GenesisModuleResult { key: ModuleKey; name: string; status: "enabled" | "available" | "needs_action"; reason: string; note?: string }

type ModuleStatus = GenesisModuleResult["status"];
/** G1-A2: the reason a module is in its current state — shown in the Setup Report for support/debug. */
function moduleReason(key: ModuleKey, status: ModuleStatus): string {
  const def = MODULES[key];
  if (status === "needs_action") return def.needsAction ?? "Needs setup before it goes live.";
  if (status === "available") return "Available for your industry — switch it on when you're ready.";
  return "Included and active in your plan.";
}
function moduleResult(key: ModuleKey, status: ModuleStatus): GenesisModuleResult {
  const reason = moduleReason(key, status);
  return { key, name: MODULES[key].name, status, reason, note: reason };
}

/** Read a tenant's module enablement state. */
export async function listTenantModules(tenantId: string): Promise<{ moduleKey: string; enabled: boolean }[]> {
  const { data } = await svc().from("tenant_modules").select("module_key, enabled").eq("tenant_id", tenantId);
  return (data ?? []).map((r: any) => ({ moduleKey: r.module_key, enabled: !!r.enabled }));
}

/** Enable/disable one module for a tenant (idempotent upsert). */
export async function setTenantModule(tenantId: string, moduleKey: ModuleKey, enabled: boolean): Promise<void> {
  await svc().from("tenant_modules").upsert(
    { tenant_id: tenantId, module_key: moduleKey, enabled, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,module_key" },
  );
}

/**
 * Stamp the canonical structure into a tenant (idempotent): the universal CORE (default sales
 * pipeline today; grows to tags/custom-fields/starter-automations/site) + the industry profile's
 * MODULES (D-381). Returns the Genesis module report (A-1): which modules were enabled, which are
 * available-but-off, and which need a tenant action (IDX board approval, Stripe connect) first.
 * Every tenant inherits whatever lands here — change the blueprint once, all future tenants inherit.
 */
export async function applyTenantBlueprint(tenantId: string, industryKey?: string | null): Promise<{ industry: string; modules: GenesisModuleResult[] }> {
  await ensurePipeline(tenantId); // universal core
  const profile = profileFor(industryKey);
  // D-388: persist the resolved industry on the tenant so the report reads it directly (best-effort).
  try { await svc().from("tenants").update({ industry_key: profile.key }).eq("id", tenantId); } catch { /* column 0077 may not be applied yet */ }
  const modules: GenesisModuleResult[] = [];
  for (const key of profile.defaultModules) {
    await setTenantModule(tenantId, key, true);
    modules.push(moduleResult(key, MODULES[key].needsAction ? "needs_action" : "enabled"));
  }
  for (const key of profile.recommendedModules) {
    await setTenantModule(tenantId, key, false);
    modules.push(moduleResult(key, "available"));
  }
  return { industry: profile.key, modules };
}

/** D-389: record one audit row per provisioning run (best-effort; table 0078 may not be applied). */
export async function recordGenesisRun(tenantId: string, run: {
  status: "success" | "partial_success" | "failed"; triggeredBy?: string; report: unknown; errorsSummary?: string | null;
}): Promise<void> {
  try {
    await svc().from("genesis_runs").insert({
      tenant_id: tenantId, status: run.status, triggered_by: run.triggeredBy ?? null,
      report: (run.report ?? {}) as Record<string, unknown>, errors_summary: run.errorsSummary ?? null,
    });
  } catch { /* audit is best-effort — never blocks provisioning */ }
}

/** Genesis Report v2 (A-1): the LIVE provisioning state of a tenant, read back from the DB so the
 *  surface stays accurate after the fact (not just the one-shot provision return). Reconstructs the
 *  module report from `tenant_modules`, infers the industry, and counts what landed. */
export interface GenesisReport {
  industry: string | null;
  industryName: string | null;
  modules: GenesisModuleResult[];
  sampleListings: number;
  customerContact: boolean;
  /** false when no `tenant_modules` rows exist yet (blueprint never ran / migration 0076 not applied). */
  provisioned: boolean;
  /** G1-A1: true once a live CREA DDF feed is active + terms accepted. */
  ddfConfigured: boolean;
  /** G1-A1: IDX/VOW is on but DDF isn't configured → the site is on sample data, not live MLS. */
  sampleMode: boolean;
}

const STATUS_ORDER: Record<GenesisModuleResult["status"], number> = { enabled: 0, needs_action: 1, available: 2 };

/** Infer the industry profile from the exact set of module keys the tenant carries. */
function inferIndustry(moduleKeys: Set<string>): { key: string; name: string } | null {
  for (const p of INDUSTRY_PROFILES) {
    const full = new Set<string>([...p.defaultModules, ...p.recommendedModules]);
    if (full.size === moduleKeys.size && [...full].every((k) => moduleKeys.has(k))) return { key: p.key, name: p.name };
  }
  return null;
}

export async function getGenesisReport(tenantId: string): Promise<GenesisReport> {
  const sb = svc();
  const rows = await listTenantModules(tenantId);
  const modules: GenesisModuleResult[] = [];
  const keySet = new Set<string>();
  for (const r of rows) {
    const def = MODULES[r.moduleKey as ModuleKey];
    if (!def) continue;
    keySet.add(r.moduleKey);
    modules.push(moduleResult(def.key, r.enabled ? (def.needsAction ? "needs_action" : "enabled") : "available"));
  }
  modules.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));

  // sample listings + customer-contact + live-feed status (all best-effort; never throw)
  let sampleListings = 0;
  try {
    const { count } = await sb.from("idx_listings").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("source", "sample");
    sampleListings = count ?? 0;
  } catch { /* idx tables may not exist for a non-RE tenant */ }
  let customerContact = false;
  if (tenantId !== PLATFORM_TENANT_ID) {
    try {
      const src = tenantLinkSource(tenantId);
      customerContact = (await listContacts(PLATFORM_TENANT_ID)).some((c) => c.source === src);
    } catch { /* best effort */ }
  }
  // G1-A1: is a live CREA DDF feed actually configured (active + terms accepted)?
  let ddfConfigured = false;
  try {
    const { data } = await sb.from("idx_feeds").select("status, terms_accepted").eq("tenant_id", tenantId).eq("source", "ddf").maybeSingle();
    ddfConfigured = !!data && data.status === "active" && !!data.terms_accepted;
  } catch { /* idx_feeds may not exist */ }

  // D-388: industry is read DIRECTLY from the tenant; fall back to module-set inference for legacy tenants.
  let industryKey: string | null = null;
  try {
    const { data } = await sb.from("tenants").select("industry_key").eq("id", tenantId).maybeSingle();
    industryKey = (data?.industry_key as string) || null;
  } catch { /* column 0077 may not be applied */ }
  const profile = industryKey ? INDUSTRY_PROFILES.find((p) => p.key === industryKey) ?? null : null;
  const inferred = profile ? { key: profile.key, name: profile.name } : inferIndustry(keySet);

  const idxOrVowOn = modules.some((m) => (m.key === "idx" || m.key === "vow") && m.status !== "available");
  return {
    industry: inferred?.key ?? null,
    industryName: inferred?.name ?? null,
    modules,
    sampleListings,
    customerContact,
    provisioned: rows.length > 0,
    ddfConfigured,
    sampleMode: idxOrVowOn && !ddfConfigured,
  };
}

/** Backfill: ensure a `trial` customer-contact exists in ABC's CRM for each tenant (skips ABC itself). */
export async function backfillCustomerContacts(tenants: { id: string; name: string }[]): Promise<{ ensured: number }> {
  let ensured = 0;
  for (const t of tenants) {
    if (t.id === PLATFORM_TENANT_ID) continue; // ABC isn't its own customer
    const r = await ensureCustomerContact({ id: t.id, name: t.name }, "trial");
    if (r.ok) ensured++;
  }
  return { ensured };
}
