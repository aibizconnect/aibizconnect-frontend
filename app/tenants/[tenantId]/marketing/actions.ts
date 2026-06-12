"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  listCampaigns, saveCampaign, deleteCampaign, resolveAudience, draftCampaign,
  sendCampaign, sendCampaignTest, type EmailCampaign, type CampaignAudience,
} from "@/lib/server/email-campaigns";
import { emailReady } from "@/lib/server/email-send";

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

export interface MarketingStatus { emailReady: boolean; emailReason?: string; tags: string[] }

/** One-shot bootstrap for the hub: sender readiness + the tag registry for audiences. */
export async function marketingStatusAction(tenantId: string): Promise<MarketingStatus> {
  await requireTenantAccess(tenantId);
  const ready = await emailReady(tenantId);
  let tags: string[] = [];
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenant_tags").select("name").eq("tenant_id", tenantId).order("name");
    tags = (data ?? []).map((t: any) => String(t.name));
  } catch { /* empty registry */ }
  return { emailReady: ready.ok, emailReason: ready.reason, tags };
}
