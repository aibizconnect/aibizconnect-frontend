"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  listCampaigns, saveCampaign, deleteCampaign, resolveAudience, draftCampaign,
  sendCampaign, sendCampaignTest, type EmailCampaign, type CampaignAudience,
} from "@/lib/server/email-campaigns";
import {
  listSmsCampaigns, saveSmsCampaign, deleteSmsCampaign, resolveSmsAudience, draftSmsCampaign,
  sendSmsCampaign, sendSmsTest, type SmsCampaign, type SmsAudience,
} from "@/lib/server/sms-campaigns";
import {
  listTriggerLinks, createTriggerLink, updateTriggerLink, deleteTriggerLink, type TriggerLink,
} from "@/lib/server/trigger-links";
import { emailReady } from "@/lib/server/email-send";
import { twilioReady } from "@/lib/server/twilio";

/** Marketing hub actions (D-280). Auth-gated; sending is explicit-human-only. */

export async function listCampaignsAction(tenantId: string): Promise<EmailCampaign[]> {
  await requireTenantAccess(tenantId);
  return listCampaigns(tenantId);
}

export async function saveCampaignAction(tenantId: string, c: EmailCampaign): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!c?.id || !c.name?.trim()) return { ok: false, message: "Campaign needs a name." };
  try { await saveCampaign(tenantId, { ...c, name: c.name.trim() }); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}

export async function deleteCampaignAction(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await deleteCampaign(tenantId, id); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}

export async function audienceCountAction(tenantId: string, audience: CampaignAudience): Promise<{ count: number; sample: string[] }> {
  await requireTenantAccess(tenantId);
  const list = await resolveAudience(tenantId, audience);
  return { count: list.length, sample: list.slice(0, 5).map((r) => r.email) };
}

export async function draftCampaignAction(tenantId: string, brief: string): Promise<{ ok: boolean; subject?: string; preheader?: string; body?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!brief.trim()) return { ok: false, message: "Tell the AI what the email is about." };
  const d = await draftCampaign(tenantId, brief.trim());
  return d ? { ok: true, ...d } : { ok: false, message: "The AI couldn't draft this — try rephrasing the brief." };
}

export async function sendCampaignTestAction(tenantId: string, c: EmailCampaign, to: string): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return sendCampaignTest(tenantId, c, to);
}

export async function sendCampaignAction(tenantId: string, campaignId: string): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  await requireTenantAccess(tenantId);
  return sendCampaign(tenantId, campaignId);
}

// ── Email templates (reusable subject/preheader/body) ───────────────────────
export interface EmailTemplate { id: string; name: string; subject: string; preheader: string; body: string; updatedAt: string }
const TPL_PREFIX = "email_template:";

export async function listTemplatesAction(tenantId: string): Promise<EmailTemplate[]> {
  await requireTenantAccess(tenantId);
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).like("setting_key", `${TPL_PREFIX}%`);
  return (data ?? []).map((r: any) => ({
    id: String(r.setting_key).slice(TPL_PREFIX.length),
    name: String(r.setting_value?.name ?? "Untitled"),
    subject: String(r.setting_value?.subject ?? ""),
    preheader: String(r.setting_value?.preheader ?? ""),
    body: String(r.setting_value?.body ?? ""),
    updatedAt: String(r.setting_value?.updatedAt ?? ""),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveTemplateAction(tenantId: string, t: EmailTemplate): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!t?.id || !t.name?.trim()) return { ok: false, message: "Template needs a name." };
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${TPL_PREFIX}${t.id}`, setting_value: { ...t, updatedAt: new Date().toISOString() }, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,setting_key" },
  );
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function deleteTemplateAction(tenantId: string, id: string): Promise<{ ok: boolean }> {
  await requireTenantAccess(tenantId);
  const sb = createSupabaseServiceClient();
  await sb.from("tenant_settings").delete().eq("tenant_id", tenantId).eq("setting_key", `${TPL_PREFIX}${id}`);
  return { ok: true };
}

export interface MarketingStatus { emailReady: boolean; emailReason?: string; smsReady: boolean; tags: string[] }

/** One-shot bootstrap for the hub: sender readiness + the tag registry for audiences. */
export async function marketingStatusAction(tenantId: string): Promise<MarketingStatus> {
  await requireTenantAccess(tenantId);
  const [ready, sms] = await Promise.all([emailReady(tenantId), twilioReady(tenantId).catch(() => false)]);
  let tags: string[] = [];
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenant_tags").select("name").eq("tenant_id", tenantId).order("name");
    tags = (data ?? []).map((t: any) => String(t.name));
  } catch { /* empty registry */ }
  return { emailReady: ready.ok, emailReason: ready.reason, smsReady: sms, tags };
}

// ── SMS campaigns (D-316..317) — mirrors email, human-approved send only ─────
export async function listSmsCampaignsAction(tenantId: string): Promise<SmsCampaign[]> {
  await requireTenantAccess(tenantId);
  return listSmsCampaigns(tenantId);
}
export async function saveSmsCampaignAction(tenantId: string, c: SmsCampaign): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!c?.id || !c.name?.trim()) return { ok: false, message: "Campaign needs a name." };
  try { await saveSmsCampaign(tenantId, { ...c, name: c.name.trim() }); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function deleteSmsCampaignAction(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await deleteSmsCampaign(tenantId, id); return { ok: true }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function smsAudienceCountAction(tenantId: string, audience: SmsAudience): Promise<{ count: number; sample: string[] }> {
  await requireTenantAccess(tenantId);
  const list = await resolveSmsAudience(tenantId, audience);
  return { count: list.length, sample: list.slice(0, 5).map((r) => r.phone) };
}
export async function draftSmsCampaignAction(tenantId: string, brief: string): Promise<{ ok: boolean; body?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!brief.trim()) return { ok: false, message: "Tell the AI what the text is about." };
  const d = await draftSmsCampaign(tenantId, brief.trim());
  return d ? { ok: true, ...d } : { ok: false, message: "The AI couldn't draft this — try rephrasing." };
}
export async function sendSmsTestAction(tenantId: string, c: SmsCampaign, to: string): Promise<{ ok: boolean; error?: string }> {
  await requireTenantAccess(tenantId);
  return sendSmsTest(tenantId, c, to);
}
export async function sendSmsCampaignAction(tenantId: string, campaignId: string): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  await requireTenantAccess(tenantId);
  return sendSmsCampaign(tenantId, campaignId);
}

// ── Trigger Links (D-319) ────────────────────────────────────────────────────
export async function listTriggerLinksAction(tenantId: string): Promise<TriggerLink[]> {
  await requireTenantAccess(tenantId);
  try { return await listTriggerLinks(tenantId); } catch { return []; }
}
export async function saveTriggerLinkAction(tenantId: string, input: { id?: string; name: string; redirectUrl: string; tagsToAdd: string[] }): Promise<{ ok: boolean; error?: string; links: TriggerLink[] }> {
  await requireTenantAccess(tenantId);
  if (!input.name.trim() || !/^https?:\/\//i.test(input.redirectUrl)) return { ok: false, error: "Name and a valid https:// URL are required.", links: await listTriggerLinks(tenantId) };
  const r = input.id
    ? await updateTriggerLink(tenantId, input.id, { name: input.name, redirectUrl: input.redirectUrl, tagsToAdd: input.tagsToAdd })
    : await createTriggerLink(tenantId, { name: input.name, redirectUrl: input.redirectUrl, tagsToAdd: input.tagsToAdd });
  return { ok: r.ok, error: r.error, links: await listTriggerLinks(tenantId) };
}
export async function deleteTriggerLinkAction(tenantId: string, id: string): Promise<TriggerLink[]> {
  await requireTenantAccess(tenantId);
  await deleteTriggerLink(tenantId, id);
  return listTriggerLinks(tenantId);
}
