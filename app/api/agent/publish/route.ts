import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supervisedPublish } from "@/lib/agent/publish";
import { decodeSub, recordSupervisorEvent, recordAgentRunToMemory, maybePageAli, type ExecutionContext } from "@/lib/agent/supervisor";

/**
 * POST /api/agent/publish — supervised publish with the critic as a HARD gate (O-3).
 * Critic fail -> 409 "Quality Gate Failed" (halt + page Ali), nothing written.
 * Critic pass -> draft promoted to live, run recorded.
 */
const bodySchema = z.object({ tenantId: z.string().uuid(), pageId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !/^Bearer\s+.+/i.test(auth)) {
    return NextResponse.json({ status: "error", error: "Unauthorized" }, { status: 401 });
  }
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid body", detail: (e as Error).message }, { status: 400 });
  }

  const ctx: ExecutionContext = {
    tenantId: body.tenantId, userId: decodeSub(auth), dryRun: false,
    planHash: `publish:${body.pageId}`, domain: "website", role: "website.editor",
  };

  const outcome = await supervisedPublish({ tenantId: body.tenantId, pageId: body.pageId });

  if (!outcome.ok && outcome.breakpoint === "Quality Gate Failed") {
    const result = { status: "blocked" as const, breakpoint: "Quality Gate Failed" as const, reason: outcome.reason ?? "quality gate failed", issues: (outcome.critic?.issues ?? []).map((i) => `${i.severity}:${i.code} ${i.message}`) };
    await recordSupervisorEvent({ ctx, stage: "pre-commit", result });
    const page = await maybePageAli(ctx, result);
    return NextResponse.json({ status: "blocked", breakpoint: "Quality Gate Failed", reason: outcome.reason, critic: outcome.critic, page }, { status: 409 });
  }
  if (!outcome.ok) {
    return NextResponse.json({ status: "error", error: outcome.reason ?? "publish failed" }, { status: 400 });
  }

  await recordAgentRunToMemory({
    ctx, plan: { actions: [] } as never,
    execResult: { status: "published", ok: true, dryRun: false } as never,
    reflection: { status: "ok", summary: `published (critic ${outcome.critic?.score}/100)` } as never,
    dryRun: false,
  });
  return NextResponse.json({ status: "published", critic: outcome.critic }, { status: 200 });
}
