import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dryRunCampaign, type CampaignDomain } from "@/lib/agent/orchestrator";

/**
 * POST /api/agent/campaign — the Mesh Orchestrator (DL-3). Composes ONE goal into a
 * cohesive set of per-domain plans (website/email/social), all brand-aligned, and
 * returns a DRY-RUN report (validation + dry-run + website critic) with a single
 * `cohesive` verdict. It opens no live path: live execution of any step still goes
 * through /api/agent/execute, where each domain's S-1/S-2 gates apply.
 */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  goal: z.string().min(3).max(2000),
  domains: z.array(z.enum(["website", "email", "social"])).optional(),
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
  const result = await dryRunCampaign({ tenantId: body.tenantId, goal: body.goal, domains: body.domains as CampaignDomain[] | undefined });
  return NextResponse.json({ status: result.cohesive ? "cohesive" : "needs-attention", result }, { status: 200 });
}
