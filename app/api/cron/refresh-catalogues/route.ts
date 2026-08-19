import { NextRequest, NextResponse } from "next/server";
import { refreshCatalogues } from "@/lib/catalogue/refresh";

/**
 * Scheduled Knowledge Catalogue refresh (A2A). Protected by the shared secret in the
 * `x-cron-secret` header (env CRON_SECRET) — fire from the Cloudflare cron worker (e.g. weekly).
 * Re-extracts content for auto-managed catalogues and refreshes the edge KV snapshots.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshCatalogues();
  return NextResponse.json({ ok: true, ...result });
}
