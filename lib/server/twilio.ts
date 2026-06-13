import { createHmac } from "node:crypto";
import { getIntegrationSecret } from "./integrations";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Server-only Twilio client (NOT "use server" → not client-callable). Credentials (account_sid +
 * auth_token) live encrypted in tenant_secrets (provider 'twilio'); non-secret config
 * (messaging_service_sid / from_number / status_callback_url) lives in tenant_integrations.config.
 * The auth token is decrypted ONLY here and NEVER returned to a client.
 *
 * sendSms exists for the future follow-up worker / automations — it is intentionally NOT called
 * anywhere yet (no-auto-send rule, TWIL-V9).
 */

const TWILIO_API = "https://api.twilio.com/2010-04-01";

export interface TwilioCreds { account_sid: string; auth_token: string }

/** Decrypt the tenant's Twilio credentials (SERVER-ONLY). */
export async function getTwilioCreds(tenantId: string): Promise<TwilioCreds | null> {
  const s = await getIntegrationSecret(tenantId, "twilio");
  if (s?.account_sid && s?.auth_token) return { account_sid: String(s.account_sid), auth_token: String(s.auth_token) };
  return null;
}

export async function twilioReady(tenantId: string): Promise<boolean> {
  return !!(await getTwilioCreds(tenantId));
}

/** E.164 phone format check (+ then 1–15 digits). */
export function isE164(n: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(n.trim());
}

function basicAuth(creds: TwilioCreds): string {
  return "Basic " + Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString("base64");
}

/** Validate credentials by fetching the account — no SMS sent. */
export async function testTwilioConnection(tenantId: string): Promise<{ ok: boolean; friendlyName?: string; status?: string; error?: string }> {
  const creds = await getTwilioCreds(tenantId);
  if (!creds) return { ok: false, error: "Twilio is not configured." };
  try {
    const res = await fetch(`${TWILIO_API}/Accounts/${encodeURIComponent(creds.account_sid)}.json`, { headers: { Authorization: basicAuth(creds) } });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message || `Twilio ${res.status}` };
    return { ok: true, friendlyName: json?.friendly_name, status: json?.status };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Twilio request failed." }; }
}

/** Non-secret config for the tenant's Twilio integration. */
async function twilioConfig(tenantId: string): Promise<Record<string, any>> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_integrations").select("config").eq("tenant_id", tenantId).eq("provider", "twilio").maybeSingle();
  return (data?.config as Record<string, any>) ?? {};
}

/**
 * Send an SMS on the tenant's behalf. Prefers a Messaging Service SID (A2P 10DLC / sticky sender),
 * falls back to a from-number. SERVER-ONLY, and deliberately UNUSED for now (the follow-up worker
 * will call this once sending is explicitly enabled).
 */
export async function sendSms(tenantId: string, opts: { to: string; body: string; from?: string }): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const creds = await getTwilioCreds(tenantId);
  if (!creds) return { ok: false, error: "Twilio is not configured." };
  if (!isE164(opts.to)) return { ok: false, error: "Recipient must be E.164 (e.g. +14165551234)." };
  const cfg = await twilioConfig(tenantId);
  const body = new URLSearchParams({ To: opts.to, Body: opts.body });
  if (cfg.messaging_service_sid) body.set("MessagingServiceSid", String(cfg.messaging_service_sid));
  else {
    const from = opts.from || cfg.from_number;
    if (!from) return { ok: false, error: "No Messaging Service SID or from-number configured." };
    body.set("From", String(from));
  }
  if (cfg.status_callback_url) body.set("StatusCallback", String(cfg.status_callback_url));
  try {
    const res = await fetch(`${TWILIO_API}/Accounts/${encodeURIComponent(creds.account_sid)}/Messages.json`, {
      method: "POST", headers: { Authorization: basicAuth(creds), "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message || `Twilio ${res.status}` };
    return { ok: true, sid: json?.sid };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Twilio send failed." }; }
}

// ── Inbound webhook support (D-298) ──────────────────────────────────────────

/** Loose phone match (last 10 digits) for mapping an inbound `To` number → tenant. */
function phoneTail(n: string): string { return (n || "").replace(/[^\d]/g, "").slice(-10); }

/**
 * Find which tenant owns the inbound `To` number. Twilio delivers inbound SMS to the webhook
 * configured on the number; we match `To` against each tenant's configured from_number.
 * Returns the tenant_id + that tenant's auth_token (needed to verify the request signature).
 */
export async function findTenantByInboundNumber(to: string): Promise<{ tenantId: string; authToken: string } | null> {
  const tail = phoneTail(to);
  if (!tail) return null;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_integrations").select("tenant_id, config").eq("provider", "twilio");
  const match = (data ?? []).find((r: any) => phoneTail(String(r.config?.from_number ?? "")) === tail);
  if (!match) return null;
  const creds = await getTwilioCreds(match.tenant_id);
  if (!creds) return null;
  return { tenantId: match.tenant_id, authToken: creds.auth_token };
}

/**
 * Verify Twilio's `X-Twilio-Signature`. Scheme: HMAC-SHA1, key = auth_token, message =
 * the full request URL with the POST params (sorted by key, key+value concatenated) appended.
 * Base64 of the digest must equal the header. (https://www.twilio.com/docs/usage/security)
 */
export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  if (!authToken || !signature) return false;
  let data = url;
  for (const key of Object.keys(params).sort()) data += key + params[key];
  const expected = createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  // constant-time-ish compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
