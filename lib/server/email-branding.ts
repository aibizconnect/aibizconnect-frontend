import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret } from "./encryption";

/**
 * Email branding (D-360 → D-404).
 *
 * D-360 set up a TENANT-WIDE header / signature / footer applied to every marketing email, with a
 * forced per-recipient unsubscribe injected server-side (composeCampaignHtml) so it can't be removed.
 *
 * D-404 (Ali) makes branding work at TWO scopes:
 *   • Workspace defaults — set by an owner/admin. A header (image), social links, a signature and a
 *     footer (image). The admin may FORCE the header / footer / social links onto every member (a
 *     per-field lock). The signature and "From" are always the member's own.
 *   • Per-member identity — every user sets their own "From" (name + email), signature, and — for any
 *     field the workspace hasn't locked — their own header / footer / social links.
 * `resolveEmailBranding(tenantId, userKey?)` merges the two with the lock rules into the effective
 * branding used when sending.
 *
 * Storage (no DDL — same tenant_settings KV convention as the original D-360):
 *   • tenant:  email_header, email_signature, email_signature_text, email_footer, email_social (jsonb),
 *              email_lock_header / email_lock_footer / email_lock_social (jsonb bool)
 *   • member:  one jsonb blob per user under key `member_email_branding:<userKey>`
 */

export interface SocialLink { platform: string; url: string }

export interface EmailBranding {
  header: string;          // HTML — e.g. an <img> banner (the image picker writes this)
  signature: string;       // HTML signature (the WYSIWYG editor writes this)
  signatureText: string;   // plain-text signature (shown when the client won't render HTML)
  footer: string;          // HTML footer (address etc. — image picker can write an <img>)
  social?: SocialLink[];   // social links rendered as a small button row
}

/** Per-field "force on all members" switches (workspace-level). */
export interface EmailBrandingPolicy { lockHeader: boolean; lockFooter: boolean; lockSocial: boolean }

/** One member's own email identity. Empty fields fall back to the workspace defaults at resolve time. */
export interface MemberEmailBranding {
  fromName: string;
  fromEmail: string;
  header: string;
  footer: string;
  signature: string;
  signatureText: string;
  social: SocialLink[];
}

/** The effective branding for a send, after merging member over workspace with the lock rules. */
export interface ResolvedBranding extends EmailBranding {
  social: SocialLink[];
  fromName: string;   // "" → use the verified workspace sender name
  fromEmail: string;  // "" → use the verified workspace sender email
}

/** Display label + brand accent for a social platform (mirrors the Settings social map). */
export const SOCIAL_META: Record<string, { label: string; accent: string }> = {
  facebook: { label: "Facebook", accent: "#1877F2" },
  instagram: { label: "Instagram", accent: "#E1306C" },
  linkedin: { label: "LinkedIn", accent: "#0A66C2" },
  tiktok: { label: "TikTok", accent: "#111111" },
  youtube: { label: "YouTube", accent: "#FF0000" },
  x: { label: "X", accent: "#111111" },
  twitter: { label: "X", accent: "#111111" },
  whatsapp: { label: "WhatsApp", accent: "#25D366" },
  website: { label: "Website", accent: "#1e3a8a" },
};
export const SOCIAL_PLATFORMS = ["facebook", "instagram", "linkedin", "youtube", "tiktok", "x", "whatsapp", "website"] as const;

const KEYS = { header: "email_header", signature: "email_signature", signatureText: "email_signature_text", footer: "email_footer", social: "email_social" } as const;
const LOCK_KEYS = { lockHeader: "email_lock_header", lockFooter: "email_lock_footer", lockSocial: "email_lock_social" } as const;
const MEMBER_PREFIX = "member_email_branding:";

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const bool = (v: unknown): boolean => v === true || v === "true";
function asSocial(v: unknown): SocialLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x: any) => ({ platform: str(x?.platform).toLowerCase().trim(), url: str(x?.url).trim() }))
    .filter((s) => s.platform && s.url);
}

/** Crude HTML→text for the text/plain alternative: drop tags, decode the few common entities. */
export const stripTags = (html: string): string =>
  html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n").trim();

// ── Workspace (tenant) branding ───────────────────────────────────────────────
export async function getEmailBranding(tenantId: string): Promise<EmailBranding> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", Object.values(KEYS));
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  return {
    header: str(m[KEYS.header]),
    signature: str(m[KEYS.signature]),
    signatureText: str(m[KEYS.signatureText]),
    footer: str(m[KEYS.footer]),
    social: asSocial(m[KEYS.social]),
  };
}

export async function saveEmailBranding(tenantId: string, b: Partial<EmailBranding>): Promise<void> {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const rows: any[] = [];
  const push = (key: string, value: unknown) => rows.push({ tenant_id: tenantId, setting_key: key, setting_value: value, updated_at: now });
  if (b.header !== undefined) push(KEYS.header, str(b.header));
  if (b.signature !== undefined) push(KEYS.signature, str(b.signature));
  if (b.signatureText !== undefined) push(KEYS.signatureText, str(b.signatureText));
  if (b.footer !== undefined) push(KEYS.footer, str(b.footer));
  if (b.social !== undefined) push(KEYS.social, asSocial(b.social));
  if (rows.length) await sb.from("tenant_settings").upsert(rows, { onConflict: "tenant_id,setting_key" });
}

export async function getEmailBrandingPolicy(tenantId: string): Promise<EmailBrandingPolicy> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).in("setting_key", Object.values(LOCK_KEYS));
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, r.setting_value]));
  return { lockHeader: bool(m[LOCK_KEYS.lockHeader]), lockFooter: bool(m[LOCK_KEYS.lockFooter]), lockSocial: bool(m[LOCK_KEYS.lockSocial]) };
}

export async function saveEmailBrandingPolicy(tenantId: string, p: Partial<EmailBrandingPolicy>): Promise<void> {
  const sb = createSupabaseServiceClient();
  const now = new Date().toISOString();
  const rows: any[] = [];
  (Object.keys(LOCK_KEYS) as (keyof EmailBrandingPolicy)[]).forEach((k) => {
    if (p[k] !== undefined) rows.push({ tenant_id: tenantId, setting_key: LOCK_KEYS[k], setting_value: !!p[k], updated_at: now });
  });
  if (rows.length) await sb.from("tenant_settings").upsert(rows, { onConflict: "tenant_id,setting_key" });
}

// ── Per-member branding ───────────────────────────────────────────────────────
export const emptyMemberBranding = (): MemberEmailBranding => ({ fromName: "", fromEmail: "", header: "", footer: "", signature: "", signatureText: "", social: [] });

export async function getMemberEmailBranding(tenantId: string, userKey: string): Promise<MemberEmailBranding> {
  if (!userKey) return emptyMemberBranding();
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_settings").select("setting_value").eq("tenant_id", tenantId).eq("setting_key", `${MEMBER_PREFIX}${userKey}`).maybeSingle();
  const v: any = data?.setting_value ?? {};
  return {
    fromName: str(v.fromName), fromEmail: str(v.fromEmail).toLowerCase().trim(),
    header: str(v.header), footer: str(v.footer),
    signature: str(v.signature), signatureText: str(v.signatureText),
    social: asSocial(v.social),
  };
}

export async function saveMemberEmailBranding(tenantId: string, userKey: string, patch: Partial<MemberEmailBranding>): Promise<void> {
  if (!userKey) throw new Error("No signed-in user to save personal branding for.");
  const cur = await getMemberEmailBranding(tenantId, userKey);
  const next: MemberEmailBranding = {
    fromName: patch.fromName !== undefined ? str(patch.fromName) : cur.fromName,
    fromEmail: patch.fromEmail !== undefined ? str(patch.fromEmail).toLowerCase().trim() : cur.fromEmail,
    header: patch.header !== undefined ? str(patch.header) : cur.header,
    footer: patch.footer !== undefined ? str(patch.footer) : cur.footer,
    signature: patch.signature !== undefined ? str(patch.signature) : cur.signature,
    signatureText: patch.signatureText !== undefined ? str(patch.signatureText) : cur.signatureText,
    social: patch.social !== undefined ? asSocial(patch.social) : cur.social,
  };
  await createSupabaseServiceClient().from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${MEMBER_PREFIX}${userKey}`, setting_value: next, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,setting_key" },
  );
}

/**
 * Effective branding for a send. With no userKey, returns the workspace branding as-is. With a
 * userKey, the member's own signature / from always win; header / footer / social use the member's
 * value UNLESS the workspace has locked that field (then the workspace value is forced).
 */
export async function resolveEmailBranding(tenantId: string, userKey?: string | null): Promise<ResolvedBranding> {
  const tenant = await getEmailBranding(tenantId);
  const tSocial = tenant.social ?? [];
  if (!userKey) {
    return { header: tenant.header, footer: tenant.footer, signature: tenant.signature, signatureText: tenant.signatureText, social: tSocial, fromName: "", fromEmail: "" };
  }
  const [policy, me] = await Promise.all([getEmailBrandingPolicy(tenantId), getMemberEmailBranding(tenantId, userKey)]);
  const pick = (locked: boolean, mine: string, fallback: string) => (locked ? fallback : (mine.trim() ? mine : fallback));
  return {
    header: pick(policy.lockHeader, me.header, tenant.header),
    footer: pick(policy.lockFooter, me.footer, tenant.footer),
    signature: me.signature.trim() ? me.signature : tenant.signature,
    signatureText: me.signatureText.trim() ? me.signatureText : tenant.signatureText,
    social: policy.lockSocial ? tSocial : (me.social.length ? me.social : tSocial),
    fromName: me.fromName.trim(),
    fromEmail: me.fromEmail.trim(),
  };
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
// Tenant/member content is their own; we keep newlines and allow simple inline HTML.
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
/** A small button row of the configured social links (email-client-safe inline-styled <a> pills). */
export function socialHtml(b: EmailBranding): string {
  const links = (b.social ?? []).filter((s) => s.platform && s.url);
  if (!links.length) return "";
  const pills = links.map((s) => {
    const meta = SOCIAL_META[s.platform] ?? { label: s.platform.replace(/^\w/, (c) => c.toUpperCase()), accent: "#475569" };
    const href = /^https?:\/\//i.test(s.url) || s.platform === "whatsapp" ? s.url : `https://${s.url}`;
    return `<a href="${href}" style="display:inline-block;background:${meta.accent};color:#ffffff;border-radius:6px;padding:5px 11px;margin:0 6px 6px 0;font-size:12px;font-weight:600;text-decoration:none">${meta.label}</a>`;
  }).join("");
  return `<div style="margin-top:14px">${pills}</div>`;
}
/** Always-on compliance block: the unsubscribe link first (sits between signature/social and footer),
 *  then the optional footer. Injected at send time; not tenant-removable. */
export function complianceFooterHtml(tenantId: string, contactId: string, b: EmailBranding): string {
  const unsub = marketingUnsubUrl(tenantId, contactId);
  const footerText = b.footer.trim() ? `<div style="margin-top:10px">${nl2br(b.footer)}</div>` : "";
  return `<div style="font-size:12px;line-height:1.5;color:#94a3b8;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0">`
    + `<div><a href="${unsub}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a> from these emails at any time.</div>`
    + `${footerText}</div>`;
}

/** Social links as plain-text "Label: url" lines, for the text/plain alternative. */
export function socialText(b: EmailBranding): string {
  const links = (b.social ?? []).filter((s) => s.platform && s.url);
  if (!links.length) return "";
  return links.map((s) => `${(SOCIAL_META[s.platform]?.label ?? s.platform)}: ${s.url}`).join("\n");
}
