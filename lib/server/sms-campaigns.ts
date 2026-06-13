import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sendSms, twilioReady, isE164 } from "@/lib/server/twilio";
import { normalizePhone } from "@/lib/server/conversations";
import { llm, stripFences } from "@/lib/agent/llm";

/**
 * SMS CAMPAIGNS engine (D-280 sibling, GHL parity #5). Mirrors the email engine under the same
 * DRAFTS-ONLY LAW: nothing auto-sends; sendSmsCampaign() runs only from the explicit human Send,
 * behind the connected-Twilio gate. Compliance floor: dnd=true or any guard tag (Do Not Contact /
 * Unsubscribed / Bounced) is excluded from EVERY audience; an opt-out line is always appended.
 * Storage: tenant_settings rows keyed `sms_campaign:<id>` (no dedicated table needed).
 */

export type SmsStatus = "draft" | "sending" | "sent";
export interface SmsAudience { mode: "all" | "tags"; tags: string[] }
export interface SmsLogEntry { at: string; event: string; detail?: string }
export interface SmsCampaign {
  id: string; name: string; body: string; audience: SmsAudience; status: SmsStatus;
  stats: { recipients: number; sent: number; failed: number }; log: SmsLogEntry[];
  createdAt: string; updatedAt: string; sentAt: string | null;
}

const PREFIX = "sms_campaign:";
const GUARD_TAGS = ["do not contact", "unsubscribed", "bounced", "bounced email"];
const OPT_OUT = "Reply STOP to opt out.";
const svc = () => createSupabaseServiceClient();

const normalize = (raw: any, id: string): SmsCampaign => ({
  id, name: String(raw?.name ?? "Untitled SMS"), body: String(raw?.body ?? ""),
  audience: { mode: raw?.audience?.mode === "tags" ? "tags" : "all", tags: Array.isArray(raw?.audience?.tags) ? raw.audience.tags : [] },
  status: (["sending", "sent"].includes(raw?.status) ? raw.status : "draft") as SmsStatus,
  stats: { recipients: raw?.stats?.recipients ?? 0, sent: raw?.stats?.sent ?? 0, failed: raw?.stats?.failed ?? 0 },
  log: Array.isArray(raw?.log) ? raw.log.slice(-50) : [],
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  updatedAt: String(raw?.updatedAt ?? new Date().toISOString()),
  sentAt: raw?.sentAt ?? null,
});

export async function listSmsCampaigns(tenantId: string): Promise<SmsCampaign[]> {
  const { data } = await svc().from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).like("setting_key", `${PREFIX}%`);
  return (data ?? [])
    .map((r: any) => normalize(r.setting_value, String(r.setting_key).slice(PREFIX.length)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function saveSmsCampaign(tenantId: string, c: SmsCampaign): Promise<void> {
  const config = { ...c, updatedAt: new Date().toISOString() };
  const { error } = await svc().from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${PREFIX}${c.id}`, setting_value: config, updated_at: config.updatedAt },
    { onConflict: "tenant_id,setting_key" },
  );
  if (error) throw new Error(error.message);
}
export async function deleteSmsCampaign(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_settings").delete().eq("tenant_id", tenantId).eq("setting_key", `${PREFIX}${id}`);
}

/** Resolve sendable phone recipients — guard tags + dnd ALWAYS excluded; must be valid E.164. */
export async function resolveSmsAudience(tenantId: string, audience: SmsAudience): Promise<{ id: string; name: string | null; phone: string }[]> {
  const { data } = await svc().from("tenant_contacts").select("id, name, phone, tags, dnd").eq("tenant_id", tenantId).not("phone", "is", null).limit(5000);
  const wanted = audience.mode === "tags" ? audience.tags.map((t) => t.toLowerCase()) : null;
  const out: { id: string; name: string | null; phone: string }[] = [];
  const seen = new Set<string>();
  for (const c of (data ?? []) as any[]) {
    if (c.dnd) continue;
    const phone = normalizePhone(String(c.phone ?? ""));
    if (!isE164(phone) || seen.has(phone)) continue;
    const tags: string[] = (Array.isArray(c.tags) ? c.tags : []).map((t: string) => String(t).toLowerCase());
    if (tags.some((t) => GUARD_TAGS.includes(t))) continue;
    if (wanted && !tags.some((t) => wanted.includes(t))) continue;
    seen.add(phone);
    out.push({ id: c.id, name: c.name ?? null, phone });
  }
  return out;
}

/** Append the opt-out line unless the body already includes a STOP notice. */
function withOptOut(body: string): string {
  return /reply stop|text stop|\bstop\b to (opt|unsub)/i.test(body) ? body : `${body.trim()}\n\n${OPT_OUT}`;
}

export async function draftSmsCampaign(tenantId: string, brief: string): Promise<{ body: string } | null> {
  const { data } = await svc().from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId)
    .in("setting_key", ["business_name", "business_niche", "address_city"]);
  const m = Object.fromEntries((data ?? []).map((r: any) => [r.setting_key, String(r.setting_value ?? "")]));
  const facts = [m.business_name && `Business: ${m.business_name}`, m.business_niche && `Industry: ${m.business_niche}`, m.address_city && `City: ${m.address_city}`].filter(Boolean).join("\n");
  const raw = await llm.complete({
    system: `You write SMS marketing texts for small businesses. ${facts ? `BUSINESS FACTS:\n${facts}\n` : ""}Keep it under 300 characters, warm and specific, ONE clear call to action, no spammy ALL-CAPS. Do NOT add an opt-out line (the system appends it). Respond as ONE JSON object: {"body":"..."}.`,
    user: `Write the SMS. Brief: ${brief}`,
    jsonObject: true, temperature: 0.7,
  }, tenantId);
  if (!raw) return null;
  try { const j = JSON.parse(stripFences(raw)); if (typeof j.body === "string") return { body: String(j.body).slice(0, 320) }; } catch { /* */ }
  return null;
}

export async function sendSmsTest(tenantId: string, c: SmsCampaign, to: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await twilioReady(tenantId))) return { ok: false, error: "Connect Twilio in Settings → Integrations first." };
  if (!isE164(normalizePhone(to))) return { ok: false, error: "Enter a valid phone in E.164 format (e.g. +14165551234)." };
  const res = await sendSms(tenantId, { to: normalizePhone(to), body: `[TEST] ${withOptOut(c.body)}` });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** The REAL send — explicit human action only. Sequential, per-recipient log, metering. */
export async function sendSmsCampaign(tenantId: string, campaignId: string): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  if (!(await twilioReady(tenantId))) return { ok: false, error: "Connect Twilio in Settings → Integrations first." };
  const all = await listSmsCampaigns(tenantId);
  const c = all.find((x) => x.id === campaignId);
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status === "sent") return { ok: false, error: "This campaign was already sent." };
  if (!c.body.trim()) return { ok: false, error: "Message body is required." };

  const recipients = await resolveSmsAudience(tenantId, c.audience);
  if (!recipients.length) return { ok: false, error: "The audience resolved to zero sendable contacts." };

  const log = (event: string, detail?: string) => c.log.push({ at: new Date().toISOString(), event, ...(detail ? { detail } : {}) });
  c.status = "sending"; c.stats.recipients = recipients.length;
  log("send.start", `${recipients.length} recipients`);
  await saveSmsCampaign(tenantId, c);

  const body = withOptOut(c.body);
  let sent = 0, failed = 0;
  for (const r of recipients) {
    const res = await sendSms(tenantId, { to: r.phone, body });
    if (res.ok) sent++;
    else { failed++; if (failed <= 10) log("send.fail", `${r.phone}: ${res.error}`); }
  }
  c.status = "sent"; c.sentAt = new Date().toISOString(); c.stats.sent = sent; c.stats.failed = failed;
  log("send.done", `${sent} sent, ${failed} failed`);
  await saveSmsCampaign(tenantId, c);

  try { await svc().from("ai_usage_events").insert({ tenant_id: tenantId, kind: "sms_campaign_send", units: sent, meta: { campaignId, recipients: recipients.length, failed } }); } catch { /* best-effort */ }
  return { ok: true, sent, failed };
}
