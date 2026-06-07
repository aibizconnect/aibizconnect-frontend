import { getBrandMemory, type BrandMemory } from "../design/brand-memory";
import { getDomainSpec } from "./domains/registry";
import { generatePlan } from "./builder";
import { planEmail, planSocial } from "./domain-planners";
import { critiquePlan, type CriticVerdict } from "./critic";
import type { Domain } from "./v1-format";

/**
 * Mesh Orchestrator (DL-3, ratified). Turns ONE campaign goal into a COHESIVE set of
 * per-domain plans (website + email + social…), all composed against the SAME tenant
 * brand memory so the output is on-brand across modalities. It honors the ratified
 * "one domain per plan + orchestrator" rule: it never mixes domains inside a plan —
 * it sequences independent, separately-supervised per-domain plans.
 *
 * Safety: the orchestrator only PLANS and DRY-RUNS. It opens no live path. Live
 * execution of any step still flows through /api/agent/execute, where each domain's
 * S-1 (send/spend/call = G) and S-2 (proven dry-run) gates apply unchanged. The
 * website step is additionally scored by the Design/Quality critic (O-3) for cohesion.
 */

export type CampaignDomain = Extract<Domain, "website" | "email" | "social">;

export interface CampaignStep {
  domain: CampaignDomain;
  role: string;
  plan: unknown;            // v1 plan for that domain
  source: string;           // provenance: llm | fallback | template
}

export interface CampaignStepResult {
  domain: CampaignDomain;
  role: string;
  validation: { ok: boolean; violations: string[]; gatedActionIds: string[] };
  dryRun: { ok: boolean; actions: number };
  critic?: CriticVerdict;   // website only
  source: string;
}

export interface CampaignResult {
  goal: string;
  tenantId: string;
  brandSource: "db" | "default";
  steps: CampaignStepResult[];
  cohesive: boolean;        // all steps valid + website critic passes
  notes: string[];
}

/** Compose a campaign: one plan per requested domain, all brand-aligned. */
export async function composeCampaign(args: {
  tenantId: string; goal: string; domains?: CampaignDomain[];
}): Promise<{ steps: CampaignStep[]; brand: BrandMemory; brandSource: "db" | "default" }> {
  const domains = args.domains ?? ["website", "email", "social"];
  const { memory, source } = await getBrandMemory(args.tenantId);
  const steps: CampaignStep[] = [];

  for (const domain of domains) {
    if (domain === "website") {
      const g = await generatePlan({ tenantId: args.tenantId, role: "website.editor", goal: args.goal });
      if (g.plan) steps.push({ domain, role: g.role, plan: g.plan, source: g.source });
    } else if (domain === "email") {
      const { plan, source } = await planEmail(args.tenantId, args.goal, memory);
      steps.push({ domain, role: "email.creator", plan, source });
    } else if (domain === "social") {
      const { plan, source } = await planSocial(args.tenantId, args.goal, memory);
      steps.push({ domain, role: "social.creator", plan, source });
    }
  }
  return { steps, brand: memory, brandSource: source };
}

/** Dry-run + validate + (website) critique every step. No live writes. */
export async function dryRunCampaign(args: { tenantId: string; goal: string; domains?: CampaignDomain[] }): Promise<CampaignResult> {
  const { steps, brandSource } = await composeCampaign(args);
  const notes: string[] = [];
  const results: CampaignStepResult[] = [];

  for (const step of steps) {
    const spec = getDomainSpec(step.domain);
    if (!spec) { notes.push(`no spec for ${step.domain}`); continue; }
    const validation = spec.validate(step.plan);
    const dry = await spec.dryRun(step.plan, { tenantId: args.tenantId, dryRun: true });
    const result: CampaignStepResult = {
      domain: step.domain, role: step.role, source: step.source,
      validation: { ok: validation.ok, violations: validation.violations, gatedActionIds: validation.gatedActionIds },
      dryRun: { ok: dry.ok, actions: dry.results.length },
    };
    if (step.domain === "website") {
      result.critic = await critiquePlan(step.plan);
      if (!result.critic.pass) notes.push(`website critic: ${result.critic.summary}`);
    }
    results.push(result);
  }

  const cohesive = results.length > 0
    && results.every((r) => r.validation.ok && r.dryRun.ok)
    && results.every((r) => !r.critic || r.critic.pass);

  return { goal: args.goal, tenantId: args.tenantId, brandSource, steps: results, cohesive, notes };
}
