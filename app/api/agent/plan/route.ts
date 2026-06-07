import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePlan } from "@/lib/agent/builder";

/**
 * POST /api/agent/plan — Builder-Agent v2: goal -> validated AgentPlan.
 *
 * Returns a plan only (dryRun:true). It does NOT execute — the caller submits the
 * plan to /api/agent/execute, where the supervisor gates it and (optionally, when
 * AGENT_EXEC_LIVE + dryRun:false) the agent performs the writes. Separation of
 * concerns: this is the brain; the execute endpoint is the supervised hands.
 */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  role: z.string().min(1).default("website.editor"),
  goal: z.string().min(3).max(2000),
});

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

  const { plan, source, role, domain, error } = await generatePlan({ tenantId: body.tenantId, role: body.role, goal: body.goal });

  return NextResponse.json({
    status: plan ? "ok" : "stub",
    tenantId: body.tenantId,
    role,
    domain,
    source, // "llm" | "fallback" | "stub"
    note: error,
    plan, // v1.0, dryRun:true — submit to /api/agent/execute (supervised). null for stub domains.
    actionCount: plan ? plan.actions.length : 0,
  });
}
