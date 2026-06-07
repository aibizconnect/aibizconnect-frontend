import { NextRequest, NextResponse } from "next/server";
import { verifyStripeSignature, updateKycStatusCore } from "@/lib/server/kyc";

/**
 * KYC provider webhook. Signature FIRST (like the Shopify callback) — we verify the Stripe-Signature
 * HMAC over the RAW body before any parse or DB write; forged/late events are rejected outright.
 * Session-less and gate-free downstream: the tenant binding comes only from the verified event's
 * metadata / our stored session id. We persist NO PII — only lifecycle status + non-PII summary.
 *
 * Returns 200 even on benign no-ops so the provider stops retrying; returns 400 only on a bad
 * signature or unprocessable body.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "stripe" && provider !== "stripe_identity") {
    return NextResponse.json({ error: "unsupported_provider" }, { status: 404 });
  }

  // Read the RAW body for signature verification (must not be re-serialized).
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!(await verifyStripeSignature(raw, sig))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  try {
    const r = await updateKycStatusCore(event);
    // Always 200 on a handled event (incl. idempotent no-ops) so retries stop.
    return NextResponse.json({ ok: r.ok, message: r.message });
  } catch (e: any) {
    // Surface 500 so the provider retries on a genuine processing error.
    return NextResponse.json({ error: e?.message ?? "processing_error" }, { status: 500 });
  }
}
