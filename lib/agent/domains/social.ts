import type { Domain } from "../v1-format";
import type { DomainSpec, DomainContext, DomainValidation, DomainExecutionResult } from "./types";
import { keyStore } from "../keystore";

/**
 * Social domain — the second non-website reference executor, modeled exactly on the
 * proven email domain (DL-1). Posture (ratified by Copilot):
 *   - dry-run capable NOW;
 *   - publishPost is a `send` capability -> ALWAYS G-gated (S-1, human approval);
 *   - live publishing BLOCKED until: dry-run proven (S-2) + a social key resolves via
 *     the KeyStore (E-3) + per-publish human approval.
 *
 * High design-system synergy: createPostDraft content is brand-memory/critic-aware in
 * the same way website sections are, so social output stays on-brand and cohesive.
 *
 * Action contract (social v1):
 *   createPostDraft { platform, body, media? } -> build (safe)
 *   schedulePost    { postRef, when }           -> build (safe; no publish yet)
 *   publishPost     { postRef, platform }        -> send  (G-gated, live-blocked)
 *   listPosts       { platform? }                -> analyze (read-only)
 */

const PLATFORMS = ["x", "linkedin", "facebook", "instagram"] as const;
const ACTIONS = ["createPostDraft", "schedulePost", "publishPost", "listPosts"] as const;
const GATED = ["publishPost"] as const;

interface SocialPlan {
  domain?: string;
  tenantId?: string;
  dryRun?: boolean;
  actions?: Array<{ id: string; type: string; params?: Record<string, unknown>; ref?: Record<string, string> }>;
}

function asPlan(plan: unknown): SocialPlan {
  return (plan && typeof plan === "object" ? plan : {}) as SocialPlan;
}

export const socialDomain: DomainSpec = {
  domain: "social" as Domain,
  label: "Social",
  actionWhitelist: ACTIONS,
  gatedActionTypes: GATED,
  capabilities: ["build", "send", "analyze"],
  // S-2 SATISFIED: a dry-run was proven + LOGGED to agent_runs (domain='social',
  // dry_run=true) via the supervised endpoint on 2026-06-01 (plan_4a38984e).
  // As with email, flipping these records the proof only — live publishing is STILL
  // blocked at runtime by two independent gates:
  //   (1) execute() requires keyStore.has('social') -> currently absent (keyless), and
  //   (2) publishPost is G-gated upstream in the execute route (S-1, human approval).
  liveEnabled: true,
  dryRunProven: true,

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
    if (actions.length === 0) violations.push("social plan has no actions");
    for (const a of actions) {
      if (!a?.id) violations.push("action missing id");
      if (!ACTIONS.includes(a?.type as (typeof ACTIONS)[number])) {
        violations.push(`action "${a?.type}" not in social whitelist`);
      }
      if (GATED.includes(a?.type as (typeof GATED)[number])) gatedActionIds.push(a.id);
      if (a?.type === "createPostDraft") {
        const plat = String(a.params?.platform ?? "");
        if (!plat) violations.push(`createPostDraft ${a.id}: missing platform`);
        else if (!PLATFORMS.includes(plat as (typeof PLATFORMS)[number])) violations.push(`createPostDraft ${a.id}: unknown platform "${plat}"`);
        if (!a.params?.body) violations.push(`createPostDraft ${a.id}: missing body`);
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
        ? `simulated (publish is G-gated; would require human approval for tenant ${ctx.tenantId})`
        : "simulated",
    }));
    return { ok: true, dryRun: true, results };
  },

  async execute(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult> {
    const p = asPlan(plan);
    const actions = Array.isArray(p.actions) ? p.actions : [];
    const key = await keyStore.has("social", ctx.tenantId);
    if (!this.liveEnabled || !this.dryRunProven || !key.present) {
      return {
        ok: false, dryRun: false,
        results: actions.map((a) => ({ id: a.id, type: a.type, status: "blocked" as const, detail: "social live execution not yet enabled" })),
        error: `social live BLOCKED (liveEnabled=${this.liveEnabled}, dryRunProven=${this.dryRunProven}, socialKey=${key.present}). Tenant ${ctx.tenantId}.`,
      };
    }
    // TODO(enable): resolve key + call the platform API for non-gated build actions
    // (createPostDraft/schedulePost). publishPost never reaches here (G-gated).
    return { ok: false, dryRun: false, results: [], error: "social live executor not implemented (enable path pending)" };
  },
};
