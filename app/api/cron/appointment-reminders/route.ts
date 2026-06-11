import { NextRequest, NextResponse } from "next/server";
import { runDueAppointmentReminders } from "@/lib/server/appointment-reminders";

/**
 * Scheduled trigger for appointment reminders (D-257). Protected by the shared secret in the
 * `x-cron-secret` header matching env CRON_SECRET — driven every 15 min by the Cloudflare
 * cron worker (deploy/cron-worker-cf). Idempotent — reminders_sent markers make double runs safe.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueAppointmentReminders();
  return NextResponse.json({ ok: true, ...result });
}
