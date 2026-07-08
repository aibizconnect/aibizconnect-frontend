import { NextRequest, NextResponse } from "next/server";
import { confirmAddonPurchase } from "@/lib/marketplace/checkout";

/** Stripe Checkout return for a marketplace add-on. Verifies + activates, then lands on Manage. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const cs = req.nextUrl.searchParams.get("cs") || "";
  const back = new URL(`/tenants/${tenantId}/marketplace/manage`, req.url);
  if (cs) {
    const r = await confirmAddonPurchase(tenantId, cs).catch(() => ({ ok: false }));
    back.searchParams.set(r.ok ? "added" : "error", "1");
  }
  return NextResponse.redirect(back);
}
