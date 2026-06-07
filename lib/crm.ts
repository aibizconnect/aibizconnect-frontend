import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * CRM core — Contacts + Opportunities pipeline. This is the hub that Funnels, Forms, the
 * onboarding wizard, and Automation all feed into. Data-only; no sends/charges here.
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export interface Contact { id: string; name: string; email: string; phone: string; tags: string[]; score: number; source: string | null; }
export interface Opportunity { id: string; name: string; value: number; stage: string; status: "open" | "won" | "lost"; contact_id: string | null; }
export interface Pipeline { id: string; name: string; stages: string[]; }

// ---- contacts ----
export async function listContacts(tenantId: string): Promise<Contact[]> {
  const { data } = await service().from("tenant_contacts").select("id,name,email,phone,tags,score,source").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "", tags: r.tags ?? [], score: r.score ?? 0, source: r.source }));
}
export async function createContact(tenantId: string, c: { name?: string; email?: string; phone?: string; source?: string }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_contacts").insert({ tenant_id: tenantId, name: c.name ?? "", email: c.email ?? "", phone: c.phone ?? "", source: c.source ?? "manual" });
  return { ok: !error, error: error?.message };
}
export async function deleteContact(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_contacts").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ---- pipeline ----
export async function ensurePipeline(tenantId: string): Promise<Pipeline> {
  const sb = service();
  const { data } = await sb.from("tenant_pipelines").select("id,name,stages").eq("tenant_id", tenantId).order("created_at").limit(1);
  if (data && data[0]) return { id: data[0].id, name: data[0].name, stages: data[0].stages };
  const { data: created } = await sb.from("tenant_pipelines").insert({ tenant_id: tenantId, name: "Sales Pipeline" }).select("id,name,stages").single();
  return { id: created!.id, name: created!.name, stages: created!.stages };
}

// ---- opportunities ----
export async function listOpportunities(tenantId: string, pipelineId: string): Promise<Opportunity[]> {
  const { data } = await service().from("tenant_opportunities").select("id,name,value,stage,status,contact_id").eq("tenant_id", tenantId).eq("pipeline_id", pipelineId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, value: Number(r.value) || 0, stage: r.stage, status: r.status, contact_id: r.contact_id }));
}
export async function createOpportunity(tenantId: string, pipelineId: string, o: { name: string; value?: number; stage: string }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_opportunities").insert({ tenant_id: tenantId, pipeline_id: pipelineId, name: o.name, value: o.value ?? 0, stage: o.stage });
  return { ok: !error, error: error?.message };
}
export async function moveOpportunity(tenantId: string, id: string, stage: string): Promise<void> {
  await service().from("tenant_opportunities").update({ stage, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
}
export async function deleteOpportunity(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_opportunities").delete().eq("tenant_id", tenantId).eq("id", id);
}
