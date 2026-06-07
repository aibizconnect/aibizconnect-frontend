import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  type ExecutionContext,
  decodeSub,
  hashPlan,
  supervisorPreCommitCheck,
  executePlan,
  supervisorPostRunReflection,
  recordAgentRunToMemory,
  recordSupervisorEvent,
  maybePageAli,
} from "@/lib/agent/supervisor";
import { v1PlanSchema, normalizeV1Plan } from "@/lib/agent/v1-format";
import { routeDomain } from "@/lib/agent/router";
import { createApproval } from "@/lib/agent/approvals";
import { canUseFeature, FEATURE_BY_DOMAIN } from "@/lib/entitlements";

/**
 * POST /api/agent/execute — the single SUPERVISED choke-point.
 *
 * Flow (docs/supervisor-paging-policy.md): parse -> pre-commit gate -> execute
 * (dry/live) -> reflection -> record to memory -> page on breakpoint. The
 * Builder-Agent stays the worker; this endpoint supervises every run.
 *
 * Live writes still require AGENT_EXEC_LIVE=true AND plan.dryRun=false.
 */
const bodySchema = z.object({ tenantId: z.string().uuid(), plan: z.unknown() });

export async function POST(req: NextRequest) {
  // Auth presence (full verification is the backend's job)
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer\s+.+/i.test(auth)) {
    return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 });
  }

  // 1) Parse + basic validation
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid body", detail: (e as Error).message }, { status: 400 });
  }

  // Context for supervision / memory / paging.
  const planObj = body.plan as { dryRun?: boolean } | undefined;
  const ctx: ExecutionContext = {
    tenantId: body.tenantId,
    userId: decodeSub(auth),
    dryRun: planObj?.dryRun !== false, // default true
    planHash: hashPlan(body.plan),
  };

  // Domain routing (Agent Mesh). Unimplemented domains HALT with Execution BLOCKED
  // (F) — never a silent no-op.
  const route = routeDomain(body.plan);
  ctx.domain = route.domain;
  if (!route.implemented) {
    const blockedResult = {
      status: "blocked" as const,
      breakpoint: "Execution BLOCKED" as const,
      reason: `domain "${route.domain}" is registered but not yet implemented`,
    };
    await recordSupervisorEvent({ ctx, stage: "pre-commit", result: blockedResult });
    const page = await maybePageAli(ctx, blockedResult);
    return NextResponse.json(
      { status: "blocked", reason: blockedResult.reason, breakpoint: "Execution BLOCKED", domain: route.domain, page },
      { status: 409 }
    );
  }

  // Non-website domains run through their DomainSpec (validate -> dry-run). Live
  // writes for these are gated: any send/spend/call action raises G, and live is
  // blocked until the spec is liveEnabled + dryRunProven. The website domain keeps
  // its proven core-engine path below.
  if (route.domain !== "website" && route.spec) {
    const spec = route.spec;
    const validation = spec.validate(body.plan);
    if (!validation.ok) {
      const result = { status: "blocked" as const, breakpoint: "Plan Validation Failure" as const, reason: "Plan Validation Failure", violations: validation.violations };
      await recordSupervisorEvent({ ctx, stage: "pre-commit", result });
      return NextResponse.json({ status: "blocked", domain: route.domain, reason: result.reason, violations: validation.violations }, { status: 409 });
    }

    const wantsLive = !ctx.dryRun && process.env.AGENT_EXEC_LIVE === "true";

    // ENTITLEMENT GATE (active enforcement) — a LIVE feature run requires the tenant
    // to be entitled to that feature (canUseFeature). Dry-run/preview stays open so
    // tenants can always SEE output; only live execution is monetization-gated.
    if (wantsLive) {
      const feature = FEATURE_BY_DOMAIN[route.domain];
      if (feature && !(await canUseFeature(ctx.tenantId, ctx.userId, feature))) {
        const result = { status: "blocked" as const, breakpoint: "Execution BLOCKED" as const, reason: `Entitlement required: "${feature}" is not enabled for this tenant` };
        await recordSupervisorEvent({ ctx, stage: "pre-commit", result });
        return NextResponse.json({ status: "blocked", domain: route.domain, breakpoint: "Entitlement Required", reason: result.reason, feature, upgrade: true }, { status: 402 });
      }
    }

    // G — human approval required for irreversible/cost actions (send/spend/call).
    if (wantsLive && validation.gatedActionIds.length > 0) {
      const result = { status: "blocked" as const, breakpoint: "Human Approval Required" as const, reason: `G: ${validation.gatedActionIds.length} action(s) require human approval (send/spend/call)`, gatedActionIds: validation.gatedActionIds };
      await recordSupervisorEvent({ ctx, stage: "pre-commit", result });
      const approval = await createApproval({ tenantId: ctx.tenantId, userId: ctx.userId, domain: route.domain, role: ctx.role, plan: body.plan, gatedActionIds: validation.gatedActionIds, reason: result.reason });
      const page = await maybePageAli(ctx, result);
      return NextResponse.json({ status: "blocked", domain: route.domain, breakpoint: "Human Approval Required", reason: result.reason, gatedActionIds: validation.gatedActionIds, approvalId: approval.id, page }, { status: 409 });
    }

    // F — live blocked until the spec is proven + enabled.
    if (wantsLive && !route.liveEnabled) {
      const result = { status: "blocked" as const, breakpoint: "Execution BLOCKED" as const, reason: `domain "${route.domain}" is not yet cleared for live execution (dry-run not proven / not enabled)` };
      await recordSupervisorEvent({ ctx, stage: "pre-commit", result });
      const page = await maybePageAli(ctx, result);
      return NextResponse.json({ status: "blocked", domain: route.domain, breakpoint: "Execution BLOCKED", reason: result.reason, page }, { status: 409 });
    }

    const execResult = wantsLive
      ? await spec.execute(body.plan, { tenantId: ctx.tenantId, userId: ctx.userId ?? undefined, dryRun: false })
      : await spec.dryRun(body.plan, { tenantId: ctx.tenantId, userId: ctx.userId ?? undefined, dryRun: true });
    ctx.dryRun = execResult.dryRun;
    const execForLog = { ...execResult, status: execResult.ok ? "ok" : "blocked" };
    await recordAgentRunToMemory({ ctx, plan: body.plan as never, execResult: execForLog as never, reflection: { status: "ok", summary: `${route.domain} ${execResult.dryRun ? "dry-run" : "live"}` } as never, dryRun: execResult.dryRun });
    return NextResponse.json({ status: execResult.ok ? "ok" : "blocked", domain: route.domain, execResult }, { status: execResult.ok ? 200 : 409 });
  }

  // Accept the v1.0 agent-facing format (normalize -> internal engine) OR the
  // internal plan directly. v1 normalization failures are Plan Validation (400).
  let enginePlan: unknown = body.plan;
  if (body.plan && (body.plan as { version?: string }).version === "1.0") {
    const v = v1PlanSchema.safeParse(body.plan);
    if (!v.success) {
      return NextResponse.json({ status: "blocked", reason: "Plan Validation Failure", violations: v.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 409 });
    }
    enginePlan = normalizeV1Plan(v.data).plan;
  }

  // 2) Pre-commit supervision gate
  const pre = await supervisorPreCommitCheck({ ctx, plan: enginePlan });
  if (pre.status === "blocked") {
    await recordSupervisorEvent({ ctx, stage: "pre-commit", result: pre });
    const page = await maybePageAli(ctx, pre);
    return NextResponse.json(
      { status: "blocked", reason: pre.reason, violations: pre.violations, page }, { status: 409 }
    );
  }
  const plan = pre.parsed!;
  const allowLive = process.env.AGENT_EXEC_LIVE === "true";

  // 3) Execute (dryRun or live)
  const execResult = await executePlan(ctx, plan, allowLive);
  ctx.dryRun = execResult.dryRun;

  // 4) Post-run reflection
  const reflection = await supervisorPostRunReflection({ ctx, plan, execResult, dryRun: execResult.dryRun });

  // 5) Record to memory
  await recordAgentRunToMemory({ ctx, plan, execResult, reflection, dryRun: execResult.dryRun });

  // 6) Reflection breakpoint -> halt + page
  if (reflection.status === "blocked") {
    await recordSupervisorEvent({ ctx, stage: "post-run", result: reflection });
    const page = await maybePageAli(ctx, reflection);
    return NextResponse.json(
      { status: "blocked", reason: reflection.reason, issues: reflection.issues, execResult, page }, { status: 409 }
    );
  }

  // 7) Normal success
  return NextResponse.json(
    { status: "ok", execResult, reflection: reflection.summary }, { status: 200 }
  );
}
