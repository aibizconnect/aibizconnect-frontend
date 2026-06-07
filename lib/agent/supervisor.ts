import { createClient } from "@supabase/supabase-js";
import { agentPlanSchema, MAX_ACTIONS, type AgentPlan } from "./plan-schema";
import { runPlan } from "./execute";

/**
 * Supervision layer for /api/agent/execute — the single supervised choke-point.
 * The Builder-Agent stays the worker; this enforces the A–G breakpoint taxonomy
 * (docs/supervisor-paging-policy.md): pre-commit gate -> execute -> reflection ->
 * memory -> paging. On a human-required breakpoint: HALT + report + page Ali.
 */

export type Breakpoint =
  | "Agent Safety Violation"
  | "Cross-Tenant Write Attempt"
  | "Schema Drift Detected"
  | "Plan Validation Failure"
  | "Reflection Inconsistency"
  | "Execution BLOCKED"
  | "Human Approval Required"
  | "Quality Gate Failed";

const HUMAN_REQUIRED: Breakpoint[] = [
  "Agent Safety Violation",
  "Cross-Tenant Write Attempt",
  "Schema Drift Detected",
  "Plan Validation Failure",
  "Reflection Inconsistency",
  "Execution BLOCKED",
  "Human Approval Required",
  "Quality Gate Failed",
];
export function isHumanRequiredBreakpoint(b?: string): b is Breakpoint {
  return !!b && (HUMAN_REQUIRED as string[]).includes(b);
}

export interface ExecutionContext {
  tenantId: string;
  userId: string | null;
  dryRun: boolean;
  planHash: string;
  /** Agent Mesh namespacing (M-1): which domain/role this run belongs to. */
  domain?: string | null;
  role?: string | null;
}

export interface SupervisorResult {
  status: "ok" | "blocked";
  breakpoint?: Breakpoint;
  reason?: string;
  violations?: string[];
  issues?: string[];
  summary?: { changes: number; risk: "low" | "medium" | "high" };
  parsed?: AgentPlan;
}

type ExecResult = Awaited<ReturnType<typeof runPlan>>;

function blocked(breakpoint: Breakpoint, extra: Partial<SupervisorResult> = {}): SupervisorResult {
  return { status: "blocked", breakpoint, reason: breakpoint, ...extra };
}
function svc() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/** Deterministic, dependency-free plan hash (not crypto — just an id). */
export function hashPlan(plan: unknown): string {
  const s = JSON.stringify(plan ?? null);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "plan_" + (h >>> 0).toString(16);
}

/** Best-effort `sub` from the (already-present) Bearer JWT for run context. */
export function decodeSub(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const payload = JSON.parse(Buffer.from(m[1].split(".")[1], "base64").toString("utf8"));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ── Whitelist (mirror of plan-schema's allowed tools) ─────────────────────────
const ALLOWED_TOOLS = new Set([
  "createPage", "saveDraft", "createGlobalBlock", "attachBlockToPage",
  "createNavItem", "publishGlobalBlock", "publishNavItem", "publishPage",
]);
const DESTRUCTIVE_TOOLS = new Set<string>([]); // none in the current whitelist

// ── (A/D) structural + safety ────────────────────────────────────────────────
function validatePlanStructure(plan: unknown): { ok: boolean; violations: string[]; parsed?: AgentPlan } {
  const r = agentPlanSchema.safeParse(plan);
  if (!r.success) return { ok: false, violations: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  if (r.data.actions.length > MAX_ACTIONS)
    return { ok: false, violations: [`MAX_ACTIONS exceeded (${r.data.actions.length} > ${MAX_ACTIONS})`] };
  return { ok: true, violations: [], parsed: r.data };
}
function runSafetyChecks(plan: AgentPlan): { ok: boolean; violations: string[] } {
  const v: string[] = [];
  for (const a of plan.actions) {
    const tool = (a as { tool: string }).tool;
    if (!ALLOWED_TOOLS.has(tool)) v.push(`forbidden tool: ${tool}`);
  }
  return { ok: v.length === 0, violations: v };
}

// ── (B) tenant scope ─────────────────────────────────────────────────────────
async function validateTenantScope(ctx: ExecutionContext): Promise<{ ok: boolean; violations: string[] }> {
  if (!ctx.userId) return { ok: false, violations: ["no acting user (unauthenticated token)"] };
  try {
    const { data, error } = await svc()
      .from("tenant_users")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (error) return { ok: true, violations: [] }; // don't false-block on infra error; RLS still guards writes
    if (!data) return { ok: false, violations: [`user ${ctx.userId} is not a member of tenant ${ctx.tenantId}`] };
    return { ok: true, violations: [] };
  } catch {
    return { ok: true, violations: [] };
  }
}

export async function supervisorPreCommitCheck(args: { ctx: ExecutionContext; plan: unknown }): Promise<SupervisorResult> {
  const structure = validatePlanStructure(args.plan);
  if (!structure.ok) return blocked("Plan Validation Failure", { violations: structure.violations });

  const safety = runSafetyChecks(structure.parsed!);
  if (!safety.ok) return blocked("Agent Safety Violation", { violations: safety.violations });

  const tenancy = await validateTenantScope(args.ctx);
  if (!tenancy.ok) return blocked("Cross-Tenant Write Attempt", { violations: tenancy.violations });

  return { status: "ok", parsed: structure.parsed };
}

// ── execute ──────────────────────────────────────────────────────────────────
export async function executePlan(ctx: ExecutionContext, plan: AgentPlan, allowLive: boolean): Promise<ExecResult> {
  return runPlan(ctx.tenantId, plan, { allowLive });
}

// ── (C/E/G) reflection + risk ────────────────────────────────────────────────
function analyzeExecutionConsistency(execResult: ExecResult): { ok: boolean; issues: string[]; changes: number } {
  const issues: string[] = [];
  let changes = 0;
  for (const r of execResult.results) {
    if (!r.ok) {
      const err = (r as { error?: string }).error ?? "unknown";
      // Schema drift surfaces as Postgres 'column/relation does not exist'.
      issues.push(/does not exist|column|relation/i.test(err) ? `SCHEMA DRIFT step ${r.step} (${r.tool}): ${err}` : `step ${r.step} (${r.tool}) failed: ${err}`);
    } else changes++;
  }
  if (execResult.status === "failed") issues.push("execution reported failed status");
  return { ok: issues.length === 0, issues, changes };
}
function assessChangeRisk(plan: AgentPlan, dryRun: boolean): { requiresHumanApproval: boolean; level: "low" | "medium" | "high"; issues: string[] } {
  const issues: string[] = [];
  if (plan.actions.some((a) => DESTRUCTIVE_TOOLS.has((a as { tool: string }).tool))) {
    issues.push("plan includes a destructive/irreversible action");
    return { requiresHumanApproval: true, level: "high", issues };
  }
  const publishes = plan.actions.filter((a) => (a as { tool: string }).tool === "publishPage").length;
  const level: "low" | "medium" | "high" = !dryRun && publishes >= 10 ? "medium" : "low";
  return { requiresHumanApproval: false, level, issues };
}

export async function supervisorPostRunReflection(args: {
  ctx: ExecutionContext; plan: AgentPlan; execResult: ExecResult; dryRun: boolean;
}): Promise<SupervisorResult> {
  const analysis = analyzeExecutionConsistency(args.execResult);
  if (!analysis.ok) {
    const drift = analysis.issues.some((i) => i.startsWith("SCHEMA DRIFT"));
    return blocked(drift ? "Schema Drift Detected" : "Reflection Inconsistency", { issues: analysis.issues });
  }
  const risk = assessChangeRisk(args.plan, args.dryRun);
  if (risk.requiresHumanApproval) return blocked("Human Approval Required", { issues: risk.issues });
  return { status: "ok", summary: { changes: analysis.changes, risk: risk.level } };
}

// ── memory + supervisor events (graceful until DDL applied) ──────────────────
export async function recordAgentRunToMemory(args: { ctx: ExecutionContext; plan: AgentPlan; execResult: ExecResult; reflection: SupervisorResult; dryRun: boolean; }) {
  try {
    await svc().from("agent_runs").insert({
      tenant_id: args.ctx.tenantId, user_id: args.ctx.userId, plan_hash: args.ctx.planHash,
      action_count: args.plan.actions.length, dry_run: args.dryRun,
      status: args.execResult.status, reflection: args.reflection.summary ?? null,
      domain: args.ctx.domain ?? null, role: args.ctx.role ?? null,
    });
  } catch { /* table may not exist yet (DDL queued) */ }
  console.log("[agent_run]", { tenant: args.ctx.tenantId, hash: args.ctx.planHash, dryRun: args.dryRun, status: args.execResult.status });
}
export async function recordSupervisorEvent(args: { ctx: ExecutionContext; stage: "pre-commit" | "post-run"; result: SupervisorResult; }) {
  try {
    await svc().from("supervisor_events").insert({
      tenant_id: args.ctx.tenantId, user_id: args.ctx.userId, plan_hash: args.ctx.planHash,
      stage: args.stage, breakpoint: args.result.breakpoint, reason: args.result.reason,
      details: { violations: args.result.violations ?? null, issues: args.result.issues ?? null },
      domain: args.ctx.domain ?? null, role: args.ctx.role ?? null,
    });
  } catch { /* table may not exist yet (DDL queued) */ }
  console.warn("[supervisor_event]", args.stage, args.result.breakpoint, args.result.reason);
}

// ── paging (Executive Summary KEPT INTACT) ───────────────────────────────────
function executiveSummary(ctx: ExecutionContext, result: SupervisorResult): string {
  const detail = (result.violations ?? result.issues ?? [])[0] ?? "see report";
  const risk =
    result.breakpoint === "Cross-Tenant Write Attempt" ? "cross-tenant"
    : result.breakpoint === "Human Approval Required" ? "irreversible/high-impact"
    : result.breakpoint === "Schema Drift Detected" ? "data-integrity"
    : "see report";
  return [
    "⚡ EXECUTIVE SUMMARY",
    `• What: agent run halted (tenant ${ctx.tenantId}, ${ctx.planHash})`,
    `• Why halted: ${result.breakpoint} — ${detail}`,
    `• Risk: ${risk}`,
    "• Your call: review the Supervisor Report, then approve or deny resume",
  ].join("\n");
}

/** Returns the page text on a real human-required breakpoint, else null. */
export async function maybePageAli(ctx: ExecutionContext, result: SupervisorResult): Promise<string | null> {
  if (result.status !== "blocked" || !isHumanRequiredBreakpoint(result.breakpoint)) return null;
  const body = [
    "Supervisor Notice: Human Attention Required",
    `Reason: ${result.breakpoint}`,
    "Action Needed: Please review the Supervisor Report in the agent console.",
    "",
    `Tenant: ${ctx.tenantId} | User: ${ctx.userId ?? "?"} | Plan: ${ctx.planHash} | DryRun: ${ctx.dryRun}`,
    `Detail: ${(result.violations ?? result.issues ?? []).join("; ") || "—"}`,
    "",
    executiveSummary(ctx, result),
  ].join("\n");
  // Optional app-side webhook; the supervising Claude ALSO pages per directive.
  const hook = process.env.SLACK_SUPERVISOR_WEBHOOK;
  if (hook) {
    try {
      await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: body }) });
    } catch { /* non-fatal */ }
  }
  console.warn("[SUPERVISOR PAGE]\n" + body);
  return body;
}
