import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { platformWebhookSecret } from "@/lib/server/platform-stripe";

/**
 * Platform Stripe webhook (marketplace subscriptions). The app's first PAYMENT webhook —
 * checkout activation is done synchronously on the return redirect (confirmAddonPurchase);
 * this endpoint handles the ASYNC lifecycle Stripe only delivers here: renewals, cancels,
 * failed payments. Keyed by stripe_subscription_id. Signature-verified with
 * STRIPE_WEBHOOK_SECRET (HMAC-SHA256, no SDK). Always 200s (except a bad signature) so
 * Stripe doesn't retry; every DB write degrades gracefully if 0085 isn't applied.
 *
 * Register the endpoint in the Stripe dashboard:
 *   https://app.aibizconnect.app/api/webhooks/stripe
 */
export const runtime = "nodejs";

function verifyStripeSignature(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const kv of header.split(",")) { const [k, v] = kv.split("="); if (k && v) parts[k.trim()] = v.trim(); }
  const t = parts["t"]; const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1)); } catch { return false; }
}

function mapSubStatus(s: string | undefined): string {
  switch (s) {
    case "active":
    case "trialing": return "active";
    case "past_due":
    case "unpaid": return "past_due";
    case "canceled":
    case "incomplete_expired": return "canceled";
    case "incomplete": return "incomplete";
    default: return "incomplete";
  }
}

const iso = (unixSeconds: unknown): string | null =>
  typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = platformWebhookSecret();
  if (!secret) { console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — ignoring event"); return NextResponse.json({ ok: true }); }
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return new NextResponse("bad signature", { status: 400 });
  }

  let evt: any;
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  try {
    const type: string = evt?.type ?? "";
    const obj: any = evt?.data?.object ?? {};
    const sb = createSupabaseServiceClient();

    if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
      const subId = obj?.id;
      if (subId) {
        const status = type === "customer.subscription.deleted" ? "canceled" : mapSubStatus(obj?.status);
        await sb.from("marketplace_purchases").update({
          status,
          current_period_end: iso(obj?.current_period_end),
          canceled_at: type === "customer.subscription.deleted" ? (iso(obj?.canceled_at) ?? new Date().toISOString()) : iso(obj?.canceled_at),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subId);
      }
    } else if (type === "invoice.payment_failed") {
      const subId = obj?.subscription;
      if (subId) {
        await sb.from("marketplace_purchases").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", String(subId));
      }
    } else if (type === "checkout.session.completed") {
      // Return-redirect confirm is primary; here we only backfill the subscription id onto
      // the row that confirm created (no column clobber if confirm hasn't run yet).
      const sessionId = obj?.id;
      const subId = obj?.subscription;
      if (sessionId && subId) {
        await sb.from("marketplace_purchases").update({ stripe_subscription_id: String(subId), updated_at: new Date().toISOString() }).eq("stripe_session_id", String(sessionId));
      }
    }
  } catch (e) {
    console.error("[stripe-webhook] processing error", e);
  }
  return NextResponse.json({ ok: true });
}
