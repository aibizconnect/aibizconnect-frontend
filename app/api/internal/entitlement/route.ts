import { NextRequest, NextResponse } from "next/server";
import { resolveEntitlement } from "@/lib/entitlements";

/**
 * Internal: GET /api/internal/entitlement?tenant=&user=&feature= — exercises the
 * entitlement resolver. Behind the app; for QA/diagnostics of the entitlement engine.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tenant = sp.get("tenant");
  const feature = sp.get("feature");
  if (!tenant || !feature) return NextResponse.json({ error: "tenant + feature required" }, { status: 400 });
  const result = await resolveEntitlement(tenant, sp.get("user"), feature);
  return NextResponse.json({ tenant, user: sp.get("user"), feature, result });
}
