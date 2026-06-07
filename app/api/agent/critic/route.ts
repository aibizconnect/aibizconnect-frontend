import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { critiquePlan } from "@/lib/agent/critic";

/**
 * POST /api/agent/critic — the Design/Quality critic (O-3). Runs the cohesion gate
 * on a v1 website plan and returns a verdict {pass, score, issues}. Read-only: it
 * judges, never mutates. Intended to run pre-publish; a failing verdict should halt
 * the publish step and surface the issues to the supervisor/owner.
 */
const bodySchema = z.object({ plan: z.unknown() });

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
  const verdict = await critiquePlan(body.plan);
  return NextResponse.json({ status: verdict.pass ? "pass" : "fail", verdict }, { status: verdict.pass ? 200 : 409 });
}
