import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendEmail, emailReady } from "@/lib/server/email-send";
import { llm, stripFences } from "@/lib/agent/llm";
import {
  getEmailBranding, headerHtml, signatureHtml, complianceFooterHtml, marketingUnsubUrl, stripTags,
  type EmailBranding,
} from "@/lib/server/email-branding";

/**
 * EMAIL CAMPAIGNS engine (D-280 — the Marketing menu). DRAFTS-ONLY LAW: nothing here
 * auto-sends; sendCampaign() runs only from the explicit human Send action, behind the
 * verified-Resend-identity gate. The compliance floor is non-negotiable: contacts with
 * dnd=true or any guard tag (Do Not Contact / Unsubscribed / Bounced Email) are
 * excluded from EVERY audience, always — there is no way to opt them in.
 *
 * Storage: tenant_email_campaigns (0054, queued) with the standard tenant_settings
 * fallback (`email_campaign:<id>`, jsonb) so the menu works before the DDL lands.
 */

export type CampaignStatus = "draft" | "sending" | "sent";
export interface CampaignAudience { mode: "all" | "tags"; tags: string[] }
export interface CampaignLogEntry { at: string; event: string; detail?: string }
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  /** Plain text with blank-line paragraphs — rendered to simple responsive HTML at send. */
  body: string;
  audience: CampaignAudience;
  status: CampaignStatus;
  stats: { recipients: number; sent: number; failed: number };
  log: CampaignLogEntry[];
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

const FALLBACK_PREFIX = "email_campaign:";
const GUARD_TAGS = ["do not contact", "unsubscribed", "bounced email"];
const missingTable = (msg?: string) => /relation .* does not exist|Could not find the table/i.test(msg ?? "");
const svc = () => createSupabaseServiceClient();

const normalize = (raw: any, id: string): EmailCampaign => ({
  id,
  name: String(raw?.name ?? "Untitled campaign"),
  subject: String(raw?.subject ?? ""),
  preheader: String(raw?.preheader ?? ""),
  body: String(raw?.body ?? ""),
  audience: { mode: raw?.audience?.mode === "tags" ? "tags" : "all", tags: Array.isArray(raw?.audience?.tags) ? raw.audience.tags : [] },
  status: (["sending", "sent"].includes(raw?.status) ? raw.status : "draft") as CampaignStatus,
  stats: { recipients: raw?.stats?.recipients ?? 0, sent: raw?.stats?.sent ?? 0, failed: raw?.stats?.failed ?? 0 },
  log: Array.isArray(raw?.log) ? raw.log.slice(-50) : [],
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  updatedAt: String(raw?.updatedAt ?? new Date().toISOString()),
  sentAt: raw?.sentAt ?? null,
});

export async function listCampaigns(tenantId: string): Promise<EmailCampaign[]> {
  const sb = svc();
  const { data, error } = await sb.from("tenant_email_campaigns").select("id, config").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (!error) return (data ?? []).map((r: any) => normalize(r.config, r.id));
  if (!missingTable(error.message)) return [];
  const { data: rows } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).like("setting_key", `${FALLBACK_PREFIX}%`);
  return (rows ?? [])
    .map((r: any) => normalize(r.setting_value, String(r.setting_key).slice(FALLBACK_PREFIX.length)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveCampaign(tenantId: string, c: EmailCampaign): Promise<void> {
  const sb = svc();
  const config = { ...c, updatedAt: new Date().toISOString() };
  const { error } = await sb.from("tenant_email_campaigns").upsert({ id: c.id, tenant_id: tenantId, config, updated_at: config.updatedAt }, { onConflict: "id" });
  if (!error) return;
  if (!missingTable(error.message)) throw new Error(error.message);
  const { error: e2 } = await sb.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${FALLBACK_PREFIX}${c.id}`, setting_value: config, updated_at: config.updatedAt },
    { onConflict: "tenant_id,setting_key" },
  );
  if (e2) throw new Error(e2.message);
}

export async function deleteCampaign(tenantId: string, id: string): Promise<void> {
  const sb = svc();
  const { error } = await sb.from("tenant_email_campaigns").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error && !missingTable(error.message)) throw new Error(error.message);
  await sb.from("tenant_settings").delete().eq("tenant_id", tenantId).eq("setting_key", `${FALLBACK_PREFIX}${id}`);
}

/** Resolve who would receive this audience — guard tags + dnd ALWAYS excluded. */
export async function resolveAudience(tenantId: string, audience: CampaignAudience): Promise<{ id: string; name: string | null; email: string }[]> {
  const sb = svc();
  const { data } = await sb.from("tenant_contacts")
    .select("id, name, email, tags, dnd")
    .eq("tenant_id", tenantId)
    .not("email", "is", null)
    .limit(5000);
  const wanted = audience.mode === "tags" ? audience.tags.map((t) => t.toLowerCase()) : null;
  const out: { id: string; name: string | null; email: string }[] = [];
  const seen = new Set<string>();
  for (const c of (data ?? []) as any[]) {
    const email = String(c.email ?? "").trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    if (c.dnd) continue;
    const tags: string[] = (Array.isArray(c.tags) ? c.tags : []).map((t: string) => String(t).toLowerCase());
    if (tags.some((t) => GUARD_TAGS.includes(t))) continue;
    if (wanted && !tags.some((t) => wanted.includes(t))) continue;
    seen.add(email);
    out.push({ id: c.id, name: c.name ?? null, email: String(c.email).trim() });
  }
  return out;
}

/** Plain text (blank-line paragraphs) → simple responsive email HTML. */
export function campaignBodyHtml(body: string, preheader?: string): string {
  const paras = body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  const pre = preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0">${preheader}</span>` : "";
  return `${pre}<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;padding:8px">${paras}</div>`;
}

/** Full HTML email: header → body → signature → [forced unsubscribe] → footer. The unsubscribe is
 *  injected here (per-recipient), so the tenant can't remove it. */
export function composeCampaignHtml(tenantId: string, contactId: string, c: { body: string; preheader?: string }, b: EmailBranding): string {
  const pre = c.preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0">${c.preheader}</span>` : "";
  const paras = c.body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#1f2937">${p.replace(/\n/g, "<br/>")}</p>`).join("");
  return `${pre}<div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;padding:8px">`
    + `${headerHtml(b)}<div>${paras}</div>${signatureHtml(b)}${complianceFooterHtml(tenantId, contactId, b)}</div>`;
}

/** Plain-text alternative (multipart) for clients that won't render HTML. Same order; the
 *  unsubscribe URL is always present. */
export function composeCampaignText(tenantId: string, contactId: string, c: { body: string }, b: EmailBranding): string {
  const out: string[] = [];
  const h = stripTags(b.header); if (h) out.push(h, "");
  out.push(c.body.trim());
  const sig = (b.signatureText.trim() || stripTags(b.signature)); if (sig) out.push("", "--", sig);
  out.push("", `Unsubscribe: ${marketingUnsubUrl(tenantId, contactId)}`);
  const f = stripTags(b.footer); if (f) out.push("", f);
  return out.join("\n");
}

/** AI draft (subject + preheader + body) grounded in the tenant's Business Profile. */
export async function draftCampaign(tenantId: string, brief: string): Promise<{ subject: string; preheader: string; body: string } | null> {
  const sb = svc();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId)
    .in("setting_key", ["business_name", "business_niche", "business_phone", "business_website", "address_city"]);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, String(r.setting_value ?? "")]));
  const facts = [m.business_name && `Business: ${m.business_name}`, m.business_niche && `Industry: ${m.business_niche}`, m.address_city && `City: ${m.address_city}`, m.business_phone && `Phone: ${m.business_phone}`, m.business_website && `Website: ${m.business_website}`].filter(Boolean).join("\n");
  const raw = await llm.complete({
    system: `You write marketing emails for small businesses. ${facts ? `BUSINESS FACTS:\n${facts}\n` : ""}Write warm, specific, non-spammy copy. Short paragraphs. One clear call to action. No placeholders like [Name] unless asked. Respond as ONE JSON object: {"subject":"...","preheader":"...","body":"..."} — body is plain text with blank lines between paragraphs.`,
    user: `Write the email. Brief from the business owner: ${brief}`,
    jsonObject: true,
    temperature: 0.7,
  }, tenantId);
  if (!raw) return null;
  try {
    const j = JSON.parse(stripFences(raw));
    if (typeof j.subject === "string" && typeof j.body === "string") {
      return { subject: j.subject.slice(0, 150), preheader: String(j.preheader ?? "").slice(0, 150), body: String(j.body).slice(0, 8000) };
    }
  } catch { /* fall through */ }
  return null;
}

/** Send ONE test email to the requesting human. Gated on the verified sender identity. */
export async function sendCampaignTest(tenantId: string, c: EmailCampaign, to: string): Promise<{ ok: boolean; error?: string }> {
  const ready = await emailReady(tenantId);
  if (!ready.ok) return { ok: false, error: `Email isn't set up yet — ${ready.reason ?? "add a verified sender in Sites → website → Settings → Email sending."}` };
  const branding = await getEmailBranding(tenantId);
  const html = composeCampaignHtml(tenantId, "preview", c, branding);
  const text = composeCampaignText(tenantId, "preview", c, branding);
  const r = await sendEmail(tenantId, { to, subject: `[TEST] ${c.subject || c.name}`, html, text, footer: "none", headers: { "List-Unsubscribe": `<${marketingUnsubUrl(tenantId, "preview")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

/** The REAL send — explicit human action only. Sequential sends, per-recipient log,
 *  metering to ai_usage_events (kind email_campaign_send). */
export async function sendCampaign(tenantId: string, campaignId: string): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  const ready = await emailReady(tenantId);
  if (!ready.ok) return { ok: false, error: `Email isn't set up yet — ${ready.reason ?? "add a verified sender first."}` };
  const all = await listCampaigns(tenantId);
  const c = all.find((x) => x.id === campaignId);
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status === "sent") return { ok: false, error: "This campaign was already sent." };
  if (!c.subject.trim() || !c.body.trim()) return { ok: false, error: "Subject and body are required." };

  const recipients = await resolveAudience(tenantId, c.audience);
  if (!recipients.length) return { ok: false, error: "The audience resolved to zero sendable contacts." };

  const log = (event: string, detail?: string) => c.log.push({ at: new Date().toISOString(), event, ...(detail ? { detail } : {}) });
  c.status = "sending";
  c.stats.recipients = recipients.length;
  log("send.start", `${recipients.length} recipients`);
  await saveCampaign(tenantId, c);

  const branding = await getEmailBranding(tenantId);
  let sent = 0, failed = 0;
  for (const r of recipients) {
    // Per-recipient: the forced unsubscribe + List-Unsubscribe header are keyed to this contact.
    const html = composeCampaignHtml(tenantId, r.id, c, branding);
    const text = composeCampaignText(tenantId, r.id, c, branding);
    const res = await sendEmail(tenantId, {
      to: r.email, subject: c.subject, html, text, footer: "none",
      headers: { "List-Unsubscribe": `<${marketingUnsubUrl(tenantId, r.id)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) sent++;
    else { failed++; if (failed <= 10) log("send.fail", `${r.email}: ${res.error}`); }
  }
  c.status = "sent";
  c.sentAt = new Date().toISOString();
  c.stats.sent = sent;
  c.stats.failed = failed;
  log("send.done", `${sent} sent, ${failed} failed`);
  await saveCampaign(tenantId, c);

  try { await svc().from("ai_usage_events").insert({ tenant_id: tenantId, kind: "email_campaign_send", units: sent, meta: { campaignId, recipients: recipients.length, failed } }); } catch { /* metering best-effort */ }
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: "marketing.campaign.send", actorEmail: null, meta: { tenantId, campaignId, sent, failed } });
  } catch { /* best effort */ }
  return { ok: true, sent, failed };
}
