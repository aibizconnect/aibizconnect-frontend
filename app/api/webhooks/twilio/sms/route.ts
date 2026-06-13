import { NextResponse } from "next/server";
import { findTenantByInboundNumber, verifyTwilioSignature } from "@/lib/server/twilio";
import { ingestInboundSms, isStopKeyword, optOutContactByPhone } from "@/lib/server/conversations";

/**
 * Inbound SMS webhook (D-298). Twilio POSTs application/x-www-form-urlencoded when a contact
 * texts the tenant's number. We map `To` → tenant, verify the `X-Twilio-Signature` with that
 * tenant's auth token, then upsert the conversation + message. Always 200s with empty TwiML so
 * Twilio doesn't retry (even when storage is deferred pre-migration). PUBLIC route (no session).
 *
 * Configure each tenant's Twilio number "A message comes in" webhook to:
 *   https://app.aibizconnect.app/api/webhooks/twilio/sms  (HTTP POST)
 */

const TWIML_OK = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const xml = (status = 200) => new NextResponse(TWIML_OK, { status, headers: { "Content-Type": "text/xml" } });

export async function POST(req: Request) {
  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";
  } catch {
    return xml(200); // unparseable body — ack and drop
  }

  const from = params.From || "";
  const to = params.To || "";
  const body = params.Body || "";
  if (!from || !to) return xml(200);

  const tenant = await findTenantByInboundNumber(to);
  if (!tenant) {
    console.warn(`[twilio-inbound] no tenant owns ${to} — dropping`);
    return xml(200); // not ours / not configured — ack so Twilio stops retrying
  }

  // Verify signature against the public URL Twilio called.
  const signature = req.headers.get("x-twilio-signature") || "";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "app.aibizconnect.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const url = `${proto}://${host}/api/webhooks/twilio/sms`;
  if (!verifyTwilioSignature(tenant.authToken, url, params, signature)) {
    console.warn(`[twilio-inbound] bad signature for tenant ${tenant.tenantId}`);
    return xml(403);
  }

  try {
    await ingestInboundSms(tenant.tenantId, { from, to, body, messageSid: params.MessageSid });
    // Carrier-compliance: a STOP/UNSUBSCRIBE reply opts the contact out of all campaigns (D-318).
    if (isStopKeyword(body)) await optOutContactByPhone(tenant.tenantId, from);
  } catch (e) {
    console.error("[twilio-inbound] ingest failed", e);
    // still ack — message is on Twilio's side; a 500 would trigger noisy retries
  }
  return xml(200);
}
