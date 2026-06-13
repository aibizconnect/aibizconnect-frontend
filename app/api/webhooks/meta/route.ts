import { NextRequest, NextResponse } from "next/server";
import { metaWebhookVerifyToken, verifyMetaSignature, findAccountByExternalId, fetchLeadAd } from "@/lib/server/social";
import { ingestInboundMeta } from "@/lib/server/conversations";
import { createContact } from "@/lib/crm";

/**
 * Unified Meta webhook (D-327). One endpoint for Messenger + Instagram DMs + WhatsApp + Lead Ads.
 *  GET  — Meta's subscribe handshake: echo hub.challenge when hub.verify_token matches ours.
 *  POST — signature-verified (X-Hub-Signature-256, app secret); routes events:
 *         page→messaging → Conversations(facebook); page→leadgen → Contact; instagram→messaging →
 *         Conversations(instagram); whatsapp_business_account→messages → Conversations(whatsapp).
 * Tenant is matched by the entity id (Page / IG / phone-number-id) in tenant_social_accounts.
 * Always 200s quickly so Meta doesn't retry. PUBLIC route (no session). Set the callback URL to
 *   https://app.aibizconnect.app/api/webhooks/meta  with a verify token (META_WEBHOOK_VERIFY_TOKEN).
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get("hub.mode"), token = p.get("hub.verify_token"), challenge = p.get("hub.challenge");
  const expected = await metaWebhookVerifyToken();
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!(await verifyMetaSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return new NextResponse("bad signature", { status: 403 });
  }
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  try {
    const object = body?.object;
    for (const entry of body?.entry ?? []) {
      // Messenger (page) + Instagram DMs share the `messaging` array shape.
      if (object === "page" || object === "instagram") {
        const channel = object === "instagram" ? "instagram" : "facebook";
        const accountExternalId = String(entry.id);
        for (const m of entry.messaging ?? []) {
          if (m?.message?.is_echo) continue; // our own outbound, skip
          const text = m?.message?.text;
          const psid = m?.sender?.id;
          if (!text || !psid) continue;
          const acct = await findAccountByExternalId(accountExternalId);
          if (!acct) continue; // not a connected asset
          await ingestInboundMeta(acct.tenantId, { channel, accountExternalId, peerId: String(psid), body: String(text), externalMessageId: m?.message?.mid });
        }
        // Lead Ads arrive as page changes.
        for (const ch of entry.changes ?? []) {
          if (ch?.field !== "leadgen") continue;
          const pageId = String(ch?.value?.page_id ?? entry.id);
          const leadgenId = String(ch?.value?.leadgen_id ?? "");
          if (!leadgenId) continue;
          const acct = await findAccountByExternalId(pageId);
          if (!acct) continue;
          const lead = await fetchLeadAd(leadgenId, pageId);
          if (lead && (lead.email || lead.phone || lead.name)) {
            await createContact(acct.tenantId, { name: lead.name, email: lead.email, phone: lead.phone, source: "facebook_lead_ad" });
          }
        }
      }
      // WhatsApp Cloud API.
      if (object === "whatsapp_business_account") {
        for (const ch of entry.changes ?? []) {
          if (ch?.field !== "messages") continue;
          const v = ch.value ?? {};
          const phoneNumberId = String(v?.metadata?.phone_number_id ?? "");
          const profileName = v?.contacts?.[0]?.profile?.name;
          const acct = phoneNumberId ? await findAccountByExternalId(phoneNumberId) : null;
          if (!acct) continue; // WhatsApp number not registered to a tenant yet (manual config)
          for (const msg of v?.messages ?? []) {
            const text = msg?.text?.body;
            const from = msg?.from;
            if (!text || !from) continue;
            await ingestInboundMeta(acct.tenantId, { channel: "whatsapp", accountExternalId: phoneNumberId, peerId: String(from), peerName: profileName, body: String(text), externalMessageId: msg?.id });
          }
        }
      }
    }
  } catch (e) {
    console.error("[meta-webhook] processing error", e);
  }
  return NextResponse.json({ ok: true });
}
