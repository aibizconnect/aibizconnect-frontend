import type { Domain } from "../v1-format";
import type { DomainSpec, DomainContext, DomainValidation, DomainExecutionResult } from "./types";
import { keyStore } from "../keystore";

/**
 * Ads domain — third non-website reference executor, modeled on email/social (DL-1).
 * Posture (ratified by Copilot's Mesh Spec):
 *   - dry-run capable NOW (build/analyze only);
 *   - launchCampaign / setBudget are SPEND capabilities -> ALWAYS G-gated (S-1, human
 *     approval) AND additionally subject to the financial boundary: even with a key +
 *     approval, no real spend executes until Ali wires billing. They never reach a live
 *     ad-network call in this codebase.
 *   - live execution BLOCKED until: dry-run proven (S-2) + an ads key resolves (E-3) +
 *     per-action human approval (S-1).
 *
 * Action contract (ads v1):
 *   createAdDraft   { network, headline, body, cta? }  -> build   (safe)
 *   estimateReach   { network, audience }              -> analyze (read-only, simulated)
 *   setBudget       { campaignRef, amount, currency }  -> spend   (G-gated, live-blocked)
 *   launchCampaign  { campaignRef, network }           -> spend   (G-gated, live-blocked)
 */

const NETWORKS = ["meta_ads", "google_ads"] as const;
const ACTIONS = ["createAdDraft", "estimateReach", "setBudget", "launchCampaign"] as const;
const GATED = ["setBudget", "launchCampaign"] as const;

interface AdsPlan {
  domain?: string;
  tenantId?: string;
  dryRun?: boolean;
  actions?: Array<{ id: string; type: string; params?: Record<string, unknown>; ref?: Record<string, string> }>;
}

function asPlan(plan: unknown): AdsPlan {
  return (plan && typeof plan === "object" ? plan : {}) as AdsPlan;
}

export const adsDomain: DomainSpec = {
  domain: "ads" as Domain,
  label: "Ads",
  actionWhitelist: ACTIONS,
  gatedActionTypes: GATED,
  capabilities: ["build", "spend", "analyze"],
  // Stub posture: registered so it can validate + dry-run, but NOT yet live. A dry-run
  // has not been formally logged, and live spend is a hard financial boundary owned by
  // Ali. Keep both false until a dry-run is proven AND Ali enables billing.
  liveEnabled: false,
  dryRunProven: false,

  describe() {
    return {
      domain: this.domain, label: this.label, actions: ACTIONS,
      capabilities: this.capabilities, liveEnabled: this.liveEnabled, dryRunProven: this.dryRunProven,
    };
  },

  validate(plan: unknown): DomainValidation {
    const p = asPlan(plan);
    const violations: string[] = [];
    const gatedActionIds: string[] = [];
    const actions = Array.isArray(p.actions) ? p.actions : [];
    if (actions.length === 0) violations.push("ads plan has no actions");
    for (const a of actions) {
      if (!a?.id) violations.push("action missing id");
      if (!ACTIONS.includes(a?.type as (typeof ACTIONS)[number])) {
        violations.push(`action "${a?.type}" not in ads whitelist`);
      }
      if (GATED.includes(a?.type as (typeof GATED)[number])) gatedActionIds.push(a.id);
      if (a?.type === "createAdDraft") {
        const net = String(a.params?.network ?? "");
        if (!net) violations.push(`createAdDraft ${a.id}: missing network`);
        else if (!NETWORKS.includes(net as (typeof NETWORKS)[number])) violations.push(`createAdDraft ${a.id}: unknown network "${net}"`);
        if (!a.params?.headline) violations.push(`createAdDraft ${a.id}: missing headline`);
      }
      if (a?.type === "setBudget") {
        if (!a.params?.amount) violations.push(`setBudget ${a.id}: missing amount`);
        if (!a.params?.currency) violations.push(`setBudget ${a.id}: missing currency`);
      }
    }
    return { ok: violations.length === 0, violations, gatedActionIds };
  },

  async dryRun(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult> {
    const p = asPlan(plan);
    const actions = Array.isArray(p.actions) ? p.actions : [];
    const results = actions.map((a) => ({
      id: a.id,
      type: a.type,
      status: "dry" as const,
      detail: GATED.includes(a.type as (typeof GATED)[number])
        ? `simulated (spend is G-gated + financial boundary; would require human approval AND billing wiring for tenant ${ctx.tenantId})`
        : "simulated",
    }));
    return { ok: true, dryRun: true, results };
  },

  async execute(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult> {
    const p = asPlan(plan);
    const actions = Array.isArray(p.actions) ? p.actions : [];
    const key = await keyStore.has("meta_ads", ctx.tenantId);
    // Always blocked: stub + financial boundary. Even if live were enabled, spend
    // actions are G-gated upstream and require Ali to wire billing.
    return {
      ok: false, dryRun: false,
      results: actions.map((a) => ({ id: a.id, type: a.type, status: "blocked" as const, detail: "ads live execution not yet enabled (stub + financial boundary)" })),
      error: `ads live BLOCKED (liveEnabled=${this.liveEnabled}, dryRunProven=${this.dryRunProven}, adsKey=${key.present}). Spend requires human approval + billing wiring (Ali). Tenant ${ctx.tenantId}.`,
    };
  },
};
