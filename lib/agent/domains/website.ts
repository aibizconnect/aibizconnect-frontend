import type { Domain } from "../v1-format";
import { v1PlanSchema, normalizeV1Plan } from "../v1-format";
import type { DomainSpec, DomainContext, DomainValidation, DomainExecutionResult } from "./types";

/**
 * Website domain — the live, proven domain. Its real execution still flows through
 * the established supervised engine in app/api/agent/execute/route.ts
 * (normalizeV1Plan -> supervisorPreCommitCheck -> executePlan). This spec is the
 * mesh-facing descriptor + validator so website is uniform with the other domains.
 *
 * Website has NO send/spend/call actions, so gatedActionTypes is empty and
 * liveEnabled is true (dry-run was long ago proven for this domain).
 */

const ACTIONS = [
  "createPage", "updatePage", "createSection", "updateSection", "createBlock",
  "updateBlock", "attachSectionToPage", "attachBlockToPage", "updateNavigation",
  "listPages", "listSections", "listBlocks",
] as const;

export const websiteDomain: DomainSpec = {
  domain: "website" as Domain,
  label: "Website",
  actionWhitelist: ACTIONS,
  gatedActionTypes: [],
  capabilities: ["build", "analyze"],
  liveEnabled: true,
  dryRunProven: true,

  describe() {
    return {
      domain: this.domain, label: this.label, actions: ACTIONS,
      capabilities: this.capabilities, liveEnabled: this.liveEnabled, dryRunProven: this.dryRunProven,
    };
  },

  validate(plan: unknown): DomainValidation {
    const v = v1PlanSchema.safeParse(plan);
    if (!v.success) {
      return { ok: false, violations: v.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), gatedActionIds: [] };
    }
    return { ok: true, violations: [], gatedActionIds: [] };
  },

  // The execute route owns website's real dry-run/live flow via the proven engine.
  // These satisfy the interface and are safe to call directly (normalize only).
  async dryRun(plan: unknown, _ctx: DomainContext): Promise<DomainExecutionResult> {
    const v = v1PlanSchema.safeParse(plan);
    if (!v.success) return { ok: false, dryRun: true, results: [], error: "invalid website v1 plan" };
    const { plan: internal } = normalizeV1Plan(v.data);
    return {
      ok: true, dryRun: true,
      results: internal.actions.map((a, i) => ({ id: ("bind" in a && a.bind ? a.bind : `step${i}`), type: a.tool, status: "dry" as const })),
    };
  },

  async execute(_plan: unknown, _ctx: DomainContext): Promise<DomainExecutionResult> {
    return { ok: false, dryRun: false, results: [], error: "website live execution is handled by the core execute route, not the DomainSpec shell" };
  },
};
