import type { Domain } from "../v1-format";
import type { DomainSpec, DomainContext, DomainValidation, DomainExecutionResult } from "./types";
import { keyStore } from "../keystore";

/**
 * Voice domain — fourth non-website reference executor, modeled on email/social (DL-1).
 * Posture (ratified by Copilot's Mesh Spec):
 *   - dry-run capable NOW (build/analyze only);
 *   - placeCall / sendSms are CALL/SEND capabilities -> ALWAYS G-gated (S-1, human
 *     approval). Outbound telephony also has per-minute/per-message cost, so it sits
 *     behind the same financial boundary as ads.
 *   - live execution BLOCKED until: dry-run proven (S-2) + a voice key resolves (E-3,
 *     e.g. twilio) + per-action human approval (S-1).
 *
 * Action contract (voice v1):
 *   createScript    { purpose, body }            -> build   (safe)
 *   buildIVRFlow    { name, nodes }              -> build   (safe)
 *   placeCall       { to, scriptRef }            -> call    (G-gated, live-blocked)
 *   sendSms         { to, body }                 -> send    (G-gated, live-blocked)
 *   listCalls       { since? }                   -> analyze (read-only)
 */

const ACTIONS = ["createScript", "buildIVRFlow", "placeCall", "sendSms", "listCalls"] as const;
const GATED = ["placeCall", "sendSms"] as const;

interface VoicePlan {
  domain?: string;
  tenantId?: string;
  dryRun?: boolean;
  actions?: Array<{ id: string; type: string; params?: Record<string, unknown>; ref?: Record<string, string> }>;
}

function asPlan(plan: unknown): VoicePlan {
  return (plan && typeof plan === "object" ? plan : {}) as VoicePlan;
}

const E164 = /^\+[1-9]\d{6,14}$/;

export const voiceDomain: DomainSpec = {
  domain: "voice" as Domain,
  label: "Voice",
  actionWhitelist: ACTIONS,
  gatedActionTypes: GATED,
  capabilities: ["build", "call", "send", "analyze"],
  // Stub posture: registered (validate + dry-run), NOT live. placeCall/sendSms incur
  // real cost and reach real people -> stay blocked until dry-run proven AND Ali
  // enables billing + per-action approval.
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
    if (actions.length === 0) violations.push("voice plan has no actions");
    for (const a of actions) {
      if (!a?.id) violations.push("action missing id");
      if (!ACTIONS.includes(a?.type as (typeof ACTIONS)[number])) {
        violations.push(`action "${a?.type}" not in voice whitelist`);
      }
      if (GATED.includes(a?.type as (typeof GATED)[number])) gatedActionIds.push(a.id);
      if (a?.type === "createScript" && !a.params?.body) violations.push(`createScript ${a.id}: missing body`);
      if (a?.type === "placeCall" || a?.type === "sendSms") {
        const to = String(a.params?.to ?? "");
        if (!to) violations.push(`${a.type} ${a.id}: missing 'to' number`);
        else if (!E164.test(to)) violations.push(`${a.type} ${a.id}: 'to' must be E.164 (e.g. +14165551234)`);
        if (a.type === "sendSms" && !a.params?.body) violations.push(`sendSms ${a.id}: missing body`);
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
        ? `simulated (call/send is G-gated + financial boundary; would require human approval AND billing wiring for tenant ${ctx.tenantId})`
        : "simulated",
    }));
    return { ok: true, dryRun: true, results };
  },

  async execute(plan: unknown, ctx: DomainContext): Promise<DomainExecutionResult> {
    const p = asPlan(plan);
    const actions = Array.isArray(p.actions) ? p.actions : [];
    const key = await keyStore.has("twilio", ctx.tenantId);
    return {
      ok: false, dryRun: false,
      results: actions.map((a) => ({ id: a.id, type: a.type, status: "blocked" as const, detail: "voice live execution not yet enabled (stub + financial boundary)" })),
      error: `voice live BLOCKED (liveEnabled=${this.liveEnabled}, dryRunProven=${this.dryRunProven}, voiceKey=${key.present}). Call/SMS requires human approval + billing wiring (Ali). Tenant ${ctx.tenantId}.`,
    };
  },
};
