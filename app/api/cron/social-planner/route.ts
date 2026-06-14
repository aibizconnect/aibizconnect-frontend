import { NextRequest, NextResponse } from "next/server";
import { runDueSocialPosts } from "@/lib/server/social-planner";

/**
 * Scheduled publisher for the Social Planner (D-344). Protected by the shared secret in the
 * `x-cron-secret` header matching env CRON_SECRET — driven by the Cloudflare cron worker
 * (deploy/cron-worker-cf), same cadence as appointment reminders. Idempotent: each due post is
 * claimed (scheduled → posting) before publishing, so overlapping runs never double-post.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueSocialPosts();
  return NextResponse.json({ ok: true, ...result });
}
