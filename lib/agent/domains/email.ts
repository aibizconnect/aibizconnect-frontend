import type { Domain } from "../v1-format";
import type { DomainSpec, DomainContext, DomainValidation, DomainExecutionResult } from "./types";
import { keyStore } from "../keystore";

/**
 * Email domain (DL-1, the reference non-website executor). Resend-backed.
 *
 * Posture (ratified): dry-run capable NOW; live SENDING is disabled until a dry-run
 * is proven (S-2) AND the supervisor clears the human-approval gate (S-1). `sendEmail`
 * is a `send` capability -> always G-gated. Credentials are platform-level env behind
 * the KeyStore abstraction (E-3); no per-tenant Resend account yet.
 *
 * Action contract (email v1):
 *   createTemplate { name, subject, html|text }      -> build (safe)
 *   draftCampaign  { templateRef|subject, audience } -> build (safe, no send)
 *   sendCampaign   { campaignRef, audience }          -> send  (G-gated, live-blocked)
 */

const ACTIONS = ["createTemplate", "draftCampaign", "sendCampaign", "listTemplates"] as const;
const GATED = ["sendCampaign"] as const;

interface EmailPlan {
  domain?: string;
  tenantId?: string;
  dryRun?: boolean;
  actions?: Array<{ id: string; type: string; params?: Record<string, unknown>; ref?: Record<string, string> }>;
}

function asPlan(plan: unknown): EmailPlan {
  return (plan && typeof plan === "object" ? plan : {}) as EmailPlan;
}

export const emailDomain: DomainSpec = {
  domain: "email" as Domain,
  label: "Email (Resend)",
  actionWhitelist: ACTIONS,
  gatedActionTypes: GATED,
  capabilities: ["build", "send", "analyze"],
  // S-2 SATISFIED: a dry-run was proven + LOGGED to agent_runs (domain='email',
  // dry_run=true) via the supervised endpoint on 2026-06-01 (plan_9232156d).
  // liveEnabled = the domain is cleared in principle, but live execution is STILL
  // blocked at runtime by two independent gates:
  //   (1) execute() requires keyStore.has('resend') -> currently absent (keyless), and
  //   (2) sendCampaign is G-gated upstream in the execute route (S-1, human approval).
  // So flipping these does NOT enable any live send — it only records that the
  // mandatory dry-run proof exists. Real sending needs a Resend key + human approval.
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
    if (actions.length === 0) violations.push("email plan has no actions");
    for (const a of actions) {
      if (!a?.id) violations.push("action missing id");
      if (!ACTIONS.includes(a?.type as (typeof ACTIONS)[number])) {
        violations.push(`action "${a?.type}" not in email whitelist`);
      }
      if (GATED.includes(a?.type as (typeof GATED)[number])) gatedActionIds.push(a.id);
      if (a?.type === "createTemplate" && !(a.params?.subject)) violations.push(`createTemplate ${a.id}: missing subject`);
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
        ? `simulated (send is G-gated; would require human approval for tenant ${ctx.tenantId})`
        : "simulated",
    }));
    return { ok: true, dryRun: true, results };
  },

  async execute(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult> {
    // Live path stays blocked until liveEnabled + dryRunProven (S-2) AND a Resend key
    // resolves through the KeyStore (E-3). Even then, sendCampaign is G-gated upstream
    // in the execute route (S-1) — this method is only reached for non-gated actions.
    const p = asPlan(plan);
    const actions = Array.isArray(p.actions) ? p.actions : [];
    const key = await keyStore.has("resend", ctx.tenantId);
    if (!this.liveEnabled || !this.dryRunProven || !key.present) {
      return {
        ok: false, dryRun: false,
        results: actions.map((a) => ({ id: a.id, type: a.type, status: "blocked" as const, detail: "email live execution not yet enabled" })),
        error: `email live BLOCKED (liveEnabled=${this.liveEnabled}, dryRunProven=${this.dryRunProven}, resendKey=${key.present}). Tenant ${ctx.tenantId}.`,
      };
    }
    // TODO(DL-1 enable): resolve key + POST to Resend for non-gated build actions
    // (createTemplate/draftCampaign). sendCampaign never reaches here (G-gated).
    return { ok: false, dryRun: false, results: [], error: "email live executor not implemented (enable path pending)" };
  },
};
