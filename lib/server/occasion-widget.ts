import { randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveActive, OCCASION_CATALOG, type OccasionsConfig, type ActiveState } from "@/lib/occasions";

/**
 * Occasions Widget (D-398..402) — the lead-gen tool. External site owners register a domain (via the
 * GHL funnel) and embed a <script> that injects active occasions, gated on a REGISTERED + active
 * domain that matches the page host. Reuses the LOCKED occasions engine (resolveActive) read-only.
 *
 * Storage: occasion_widget_sites (migration 0084). The lead (name/email/domain) is also mirrored
 * into our platform-tenant CRM (Gemini D-399) so we can follow up.
 */

const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = () => createSupabaseServiceClient();

/** Strip protocol/path/port/www → a bare lowercase hostname ("example.com"). */
export function normalizeDomain(input: string): string {
  let s = (input || "").trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0].split("?")[0].split("#")[0].split(":")[0];
  return s.trim();
}
/** A page host matches a registered domain if equal ignoring a leading www. */
export function hostMatches(registered: string, host: string): boolean {
  const a = normalizeDomain(registered), b = normalizeDomain(host);
  return !!a && a === b;
}

const APP_BASE = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
const snippetFor = (key: string) => `<script src="${APP_BASE}/api/occasions-widget/embed?k=${key}" async></script>`;
const manageUrlFor = (key: string) => `${APP_BASE}/tools/occasions/manage?k=${key}`;

/** Default config so the widget shows value the moment it's pasted: enable whatever holiday is
 *  active today (navy banner). They can customise later in the manage page (Phase 2). */
export function defaultOccasionsConfig(today = new Date()): OccasionsConfig {
  const probe: OccasionsConfig = { banners: Object.fromEntries(OCCASION_CATALOG.map((o) => [o.id, { enabled: true }])) };
  const active = resolveActive(probe, today);
  const banners: Record<string, { enabled: boolean }> = {};
  for (const b of active.banners) banners[b.id] = { enabled: true };
  return {
    settings: {},
    bannerStyle: { bg: "#1e3a8a", textColor: "#ffffff", position: "top-center", pattern: "solid", dismissible: true },
    animations: {},
    banners,
    custom: [],
  };
}

export interface RegisterResult { ok: boolean; key?: string; domain?: string; snippet?: string; manageUrl?: string; error?: string }

const NAVY = "#1e3a8a";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The welcome email that carries the embed snippet + settings link. This is the ONLY place the
 *  snippet is delivered to a registrant (the thank-you page no longer shows it), so a working email
 *  address is required to use the widget. */
function buildWelcomeEmail(domain: string, snippet: string, manageUrl: string): { subject: string; html: string; text: string } {
  const subject = `Your Occasions widget for ${domain} 🎉`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 6px">You're all set 🎉</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 18px">Festive occasions are ready for <b style="color:${NAVY}">${esc(domain)}</b>. Add them to your site in one step:</p>
    <p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">1 · Copy this snippet and paste it just before <code style="background:#f1f5f9;padding:1px 5px;border-radius:4px">&lt;/head&gt;</code> on your website:</p>
    <div style="background:#0f172a;color:#e2e8f0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;padding:14px 16px;border-radius:10px;word-break:break-all;margin:0 0 18px">${esc(snippet)}</div>
    <p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">2 · Choose your holidays, sales banners, and animations:</p>
    <p style="margin:0 0 22px"><a href="${manageUrl}" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Open my Occasions settings →</a></p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0">Holidays and seasonal animations appear automatically on the right dates — only on your registered site. Keep this email: the settings link above is your private access to customise the widget any time.</p>
    <hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="color:#94a3b8;font-size:11px;margin:0">You're receiving this because you registered ${esc(domain)} for the free AIBizConnect Occasions widget.</p>
  </div>`;
  const text = `You're all set! Festive occasions are ready for ${domain}.

1) Copy this snippet and paste it just before </head> on your website:

${snippet}

2) Choose your holidays, sales banners, and animations here:
${manageUrl}

Holidays and seasonal animations appear automatically on the right dates — only on your registered site. Keep the settings link above to customise the widget any time.

You're receiving this because you registered ${domain} for the free AIBizConnect Occasions widget.`;
  return { subject, html, text };
}

/** Send the welcome email (snippet + settings link) to a registrant. Best-effort; never throws. */
async function sendWelcomeEmail(email: string, domain: string, key: string): Promise<boolean> {
  try {
    if (!email || !/.+@.+\..+/.test(email)) return false;
    const { sendEmail } = await import("./email-send");
    const { subject, html, text } = buildWelcomeEmail(domain, snippetFor(key), manageUrlFor(key));
    const res = await sendEmail(PLATFORM_TENANT, { to: email, subject, html, text, footer: "none" });
    if (!res.ok) console.error("[occasions-widget] welcome email failed:", res.error);
    return res.ok;
  } catch (e: any) {
    console.error("[occasions-widget] welcome email threw:", e?.message ?? e);
    return false;
  }
}

/** Create (or return the existing) widget registration for a domain, and mirror the lead to CRM. */
export async function registerWidgetSite(input: { name?: string; email?: string; domain: string; source?: string }): Promise<RegisterResult> {
  const domain = normalizeDomain(input.domain);
  if (!domain || !domain.includes(".")) return { ok: false, error: "A valid website domain is required." };
  const db = sb();

  // One registration per domain — return the existing key if it's already registered. Re-send the
  // welcome email so a re-submit (e.g. they lost the first email / fixed a typo) gets the snippet again.
  const { data: existing } = await db.from("occasion_widget_sites").select("key, domain").eq("domain", domain).maybeSingle();
  if (existing?.key) {
    if (input.email) await sendWelcomeEmail(input.email.trim().toLowerCase(), domain, existing.key);
    return { ok: true, key: existing.key, domain, snippet: snippetFor(existing.key), manageUrl: manageUrlFor(existing.key) };
  }

  const key = `ocw_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const { error } = await db.from("occasion_widget_sites").insert({
    key, name: input.name ?? null, email: (input.email ?? "").trim().toLowerCase() || null, domain,
    occasions: defaultOccasionsConfig(), active: true, verified: false, source: input.source ?? "ghl_funnel",
  });
  if (error) {
    // Race: someone inserted the domain between our check and insert → return theirs.
    if (/duplicate|unique/i.test(error.message)) {
      const { data: r } = await db.from("occasion_widget_sites").select("key").eq("domain", domain).maybeSingle();
      if (r?.key) return { ok: true, key: r.key, domain, snippet: snippetFor(r.key), manageUrl: manageUrlFor(r.key) };
    }
    return { ok: false, error: error.message };
  }

  // Mirror the lead into our platform CRM (Gemini D-399) — best-effort.
  try {
    const { createContact } = await import("@/lib/crm");
    await createContact(PLATFORM_TENANT, { name: input.name || domain, email: input.email, source: "occasions_widget", tags: ["Occasions Widget Lead"], company: domain });
  } catch { /* CRM mirror is best-effort */ }

  // Deliver the snippet + settings link by email (the only delivery channel — see snippet page).
  if (input.email) await sendWelcomeEmail(input.email.trim().toLowerCase(), domain, key);

  return { ok: true, key, domain, snippet: snippetFor(key), manageUrl: manageUrlFor(key) };
}

/** The active occasions for an embed key — ONLY if registered, active, and the page host matches the
 *  registered domain. Otherwise empty (nothing renders). This is the gate. */
export async function getActiveForKey(key: string, host: string): Promise<ActiveState | null> {
  if (!key) return null;
  const { data } = await sb().from("occasion_widget_sites").select("domain, occasions, active").eq("key", key).maybeSingle();
  if (!data || data.active === false) return null;
  if (!hostMatches(String(data.domain), host)) return null;
  return resolveActive((data.occasions ?? {}) as OccasionsConfig, new Date());
}

/** Look up a registered domain → its embed snippet + manage URL (for the thank-you page). */
export async function getSnippetForDomain(domainInput: string): Promise<{ key: string; domain: string; snippet: string; manageUrl: string } | null> {
  const domain = normalizeDomain(domainInput);
  if (!domain) return null;
  const { data } = await sb().from("occasion_widget_sites").select("key, domain").eq("domain", domain).maybeSingle();
  if (!data?.key) return null;
  return { key: data.key, domain: data.domain, snippet: snippetFor(data.key), manageUrl: manageUrlFor(data.key) };
}

/** Phase 2 helpers (manage page). */
export async function getWidgetByKey(key: string): Promise<{ key: string; name: string | null; email: string | null; domain: string; occasions: OccasionsConfig; active: boolean } | null> {
  const { data } = await sb().from("occasion_widget_sites").select("key, name, email, domain, occasions, active").eq("key", key).maybeSingle();
  if (!data) return null;
  return { key: data.key, name: data.name ?? null, email: data.email ?? null, domain: data.domain, occasions: (data.occasions ?? {}) as OccasionsConfig, active: data.active !== false };
}
export async function saveWidgetOccasions(key: string, occasions: OccasionsConfig): Promise<{ ok: boolean; error?: string }> {
  const { error } = await sb().from("occasion_widget_sites").update({ occasions, updated_at: new Date().toISOString() }).eq("key", key);
  return error ? { ok: false, error: error.message } : { ok: true };
}
