import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getIntegrationSecret } from "./integrations";
import { encryptSecret } from "./encryption";

/**
 * Server-only transactional email via Resend. Gated on a VERIFIED tenant email identity + a stored
 * Resend key. Callers: the follow-up worker (FW-V13) and the appointment engine (D-256/D-257 —
 * confirmations + reminders, owner-directed transactional sends). Marketing sends remain forbidden.
 * Setup-reminder emails carry a one-click unsubscribe link (compliance, RULING 49); appointment
 * emails carry a transactional footer instead.
 */

export interface EmailIdentity { sender_email: string; sender_name: string }

/** True when this tenant can send: verified email settings + a Resend secret present. */
export async function emailReady(tenantId: string): Promise<{ ok: boolean; identity?: EmailIdentity; reason?: string }> {
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_email_settings").select("sender_email, sender_name, status").eq("tenant_id", tenantId).eq("status", "verified").maybeSingle();
  if (!row) return { ok: false, reason: "email not verified" };
  const sec = await getIntegrationSecret(tenantId, "resend").catch(() => null);
  if (!sec?.api_key) return { ok: false, reason: "no Resend key" };
  return { ok: true, identity: { sender_email: row.sender_email, sender_name: row.sender_name } };
}

/** A signed, opaque unsubscribe token (encrypts the tenant id). */
export function unsubscribeToken(tenantId: string): string {
  return Buffer.from(encryptSecret(JSON.stringify({ t: tenantId, k: "launchpad_followup" })), "utf8").toString("base64url");
}
function unsubscribeUrl(tenantId: string): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
  return `${base}/api/followups/unsubscribe?token=${unsubscribeToken(tenantId)}`;
}

/** Send one email via Resend on the tenant's behalf. Appends the footer for its kind. Optional
 *  `text` sends a plain-text alternative (multipart) for clients that won't render HTML, and
 *  `headers` carries extra SMTP headers (e.g. List-Unsubscribe for one-click). */
export async function sendEmail(tenantId: string, msg: { to: string; subject: string; html: string; text?: string; footer?: "setup" | "appointment" | "none"; headers?: Record<string, string>; from?: { name?: string; email?: string } }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ready = await emailReady(tenantId);
  if (!ready.ok || !ready.identity) return { ok: false, error: ready.reason };
  const sec = await getIntegrationSecret(tenantId, "resend").catch(() => null);
  if (!sec?.api_key) return { ok: false, error: "no Resend key" };

  const footer = msg.footer === "none"
    ? ""
    : (msg.footer ?? "setup") === "appointment"
    ? `<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/><p style="font-size:12px;color:#94a3b8">You're receiving this about your appointment with ${ready.identity.sender_name}.</p>`
    : `<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/><p style="font-size:12px;color:#94a3b8">You're receiving this because you enabled setup reminders. <a href="${unsubscribeUrl(tenantId)}">Unsubscribe</a>.</p>`;
  // Per-user "From" override (D-404). The display NAME may always be overridden; the EMAIL is only
  // honoured when it's on the SAME verified domain as the tenant sender — otherwise Resend would
  // reject it (unverified domain), so we keep the verified address and just use the chosen name.
  const fromName = msg.from?.name?.trim() || ready.identity.sender_name;
  const overrideEmail = msg.from?.email?.trim().toLowerCase();
  const verifiedDomain = (ready.identity.sender_email.split("@")[1] || "").toLowerCase();
  const overrideDomain = (overrideEmail?.split("@")[1] || "").toLowerCase();
  const fromEmail = overrideEmail && overrideDomain && overrideDomain === verifiedDomain ? overrideEmail : ready.identity.sender_email;
  const from = `${fromName} <${fromEmail}>`;
  try {
    const body: Record<string, unknown> = { from, to: msg.to, subject: msg.subject, html: msg.html + footer };
    if (msg.text) body.text = msg.text;
    if (msg.headers && Object.keys(msg.headers).length) body.headers = msg.headers;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${String(sec.api_key)}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.message || `Resend ${res.status}` };
    return { ok: true, id: json?.id };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Resend request failed." }; }
}
