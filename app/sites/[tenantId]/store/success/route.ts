import { NextRequest, NextResponse } from "next/server";
import { confirmProductPurchase } from "@/lib/server/store";

/** Stripe Checkout return for the storefront (D-350). Verifies + records the order, then thanks. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const cs = req.nextUrl.searchParams.get("cs") || "";
  const back = new URL(`/sites/${tenantId}/store`, req.url);
  if (cs) {
    const r = await confirmProductPurchase(tenantId, cs).catch(() => ({ ok: false }));
    if (r.ok) back.searchParams.set("thanks", "1");
  }
  return NextResponse.redirect(back);
}
