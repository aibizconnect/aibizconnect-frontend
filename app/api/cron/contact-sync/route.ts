import { NextRequest, NextResponse } from "next/server";
import { runDueContactSyncs } from "@/lib/server/google-contacts";

/**
 * Scheduled trigger for Google Contacts sync (D-258). Protected by the shared secret in the
 * `x-cron-secret` header (env CRON_SECRET) — fired every 15 min by the Cloudflare cron worker;
 * the engine self-throttles to one sync per tenant per hour via config.lastSyncAt.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueContactSyncs();
  return NextResponse.json({ ok: true, ...result });
}
