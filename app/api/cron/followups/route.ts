import { NextRequest, NextResponse } from "next/server";
import { runDueFollowups } from "@/lib/server/followup-worker";

/**
 * Scheduled (best-effort) trigger for the follow-up worker. Protected by a shared secret in the
 * `x-cron-secret` header matching env CRON_SECRET. Point your host's scheduler (e.g. every 15 min)
 * at GET /api/cron/followups with that header. Idempotent — safe to run twice or miss a run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueFollowups();
  return NextResponse.json({ ok: true, ...result });
}
