import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret } from "./encryption";

/**
 * Tenant email branding (D-360): a configurable HEADER, SIGNATURE and FOOTER applied to every
 * marketing campaign email. Between the signature and the footer we ALWAYS inject a per-recipient
 * unsubscribe link — it is appended server-side in the send pipeline (composeCampaignHtml), so the
 * tenant cannot edit or remove it. Required by CASL / CAN-SPAM and good for deliverability.
 *
 * Storage: tenant_settings keys (no DDL) — `email_header`, `email_signature`, `email_footer`.
 */

export interface EmailBranding {
  header: string;        // HTML — e.g. a Canva-designed banner pasted as <img>/HTML
  signature: string;     // HTML signature
  signatureText: string; // plain-text signature (shown when the client won't render HTML)
  footer: string;        // HTML footer (address etc.)
}
const KEYS: Record<keyof EmailBranding, string> = { header: "email_header", signature: "email_signature", signatureText: "email_signature_text", footer: "email_footer" };
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
/** Crude HTML→text for the text/plain alternative: drop tags, decode the few common entities. */
export const stripTags = (html: string): string =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

export async function getEmailBranding(tenantId: string): Promise<EmailBranding> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", Object.values(KEYS));
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  return { header: str(m[KEYS.header]), signature: str(m[KEYS.signature]), signatureText: str(m[KEYS.signatureText]), footer: str(m[KEYS.footer]) };
}

export async function saveEmailBranding(tenantId: string, b: Partial<EmailBranding>): Promise<void> {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const rows = (Object.keys(KEYS) as (keyof EmailBranding)[])
    .filter((k) => b[k] !== undefined)
    .map((k) => ({ tenant_id: tenantId, setting_key: KEYS[k], setting_value: str(b[k]), updated_at: now }));
  if (rows.length) await sb.from("tenant_settings").upsert(rows, { onConflict: "tenant_id,setting_key" });
}

// ── per-recipient marketing unsubscribe token (encrypts tenant + contact) ──────────
const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
export function marketingUnsubToken(tenantId: string, contactId: string): string {
  return Buffer.from(encryptSecret(JSON.stringify({ t: tenantId, c: contactId, k: "marketing_unsub" })), "utf8").toString("base64url");
}
export function marketingUnsubUrl(tenantId: string, contactId: string): string {
  return `${APP_BASE}/api/marketing/unsubscribe?token=${marketingUnsubToken(tenantId, contactId)}`;
}

// ── HTML block builders (inner blocks — composeCampaignHtml wraps them in a 600px shell) ──
// Tenant content is admin-gated and their own; we keep newlines and allow simple inline HTML.
const nl2br = (s: string) => s.replace(/\n/g, "<br/>");

export function headerHtml(b: EmailBranding): string {
  return b.header.trim()
    ? `<div style="font-size:14px;line-height:1.5;color:#1f2937;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #e5e7eb">${nl2br(b.header)}</div>`
    : "";
}
export function signatureHtml(b: EmailBranding): string {
  return b.signature.trim()
    ? `<div style="font-size:14px;line-height:1.55;color:#374151;margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb">${nl2br(b.signature)}</div>`
    : "";
}
/** Always-on compliance block: the unsubscribe link first (sits between signature and footer),
 *  then the tenant's optional footer text. Injected at send time; not tenant-removable. */
export function complianceFooterHtml(tenantId: string, contactId: string, b: EmailBranding): string {
  const unsub = marketingUnsubUrl(tenantId, contactId);
  const footerText = b.footer.trim() ? `<div style="margin-top:10px">${nl2br(b.footer)}</div>` : "";
  return `<div style="font-size:12px;line-height:1.5;color:#94a3b8;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0">`
    + `<div><a href="${unsub}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a> from these emails at any time.</div>`
    + `${footerText}</div>`;
}
