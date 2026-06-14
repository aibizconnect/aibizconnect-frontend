import { NextRequest, NextResponse } from "next/server";
import { runDueIdxSync } from "@/lib/server/idx/sync";

/**
 * IDX feed sync (G4, D-350 — every 15 min via the CF scheduler). Secret-gated. No-op unless
 * IDX_ENABLED is on AND a tenant has an active, terms-accepted feed. Idempotent.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueIdxSync();
  return NextResponse.json({ ok: true, ...result });
}
