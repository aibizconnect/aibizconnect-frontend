import { NextRequest, NextResponse } from "next/server";
import { confirmCoursePurchase } from "@/lib/memberships";

/**
 * Stripe Checkout return (D-349). Verifies the session is paid (server-side, no webhook) and
 * enrolls the buyer, then bounces back to the course — now unlocked.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string; courseId: string }> }) {
  const { tenantId, courseId } = await params;
  const cs = req.nextUrl.searchParams.get("cs") || "";
  const back = new URL(`/learn/${tenantId}/${courseId}`, req.url);
  if (cs) {
    const r = await confirmCoursePurchase(tenantId, courseId, cs).catch(() => ({ ok: false }));
    back.searchParams.set("p", r.ok ? "ok" : "fail");
  }
  return NextResponse.redirect(back);
}
