"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Lead Scoring rules (the market-leading platform parity). Define point awards for trigger events; a tenant-level
 * "hot lead" threshold lives in tenant_settings. The evaluation engine (applying points to contacts)
 * is a later step — this manages the RULES + threshold. Tenant-scoped; admin-gated writes.
 */

export const TRIGGER_TYPES = ["tag_added", "field_equals", "form_submitted", "email_opened", "link_clicked", "page_visited"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  tag_added: "Tag added",
  field_equals: "Field equals value",
  form_submitted: "Form submitted",
  email_opened: "Email opened",
  link_clicked: "Link clicked",
  page_visited: "Page visited",
};

export interface ScoringRuleView {
  id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  points: number;
  enabled: boolean;
  position: number;
}
export interface ScoringView { rules: ScoringRuleView[]; hotThreshold: number }

async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export async function getScoring(tenantId: string): Promise<ScoringView> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const [{ data: rules }, { data: setting }] = await Promise.all([
    supabase.from("tenant_scoring_rules").select("id, name, trigger_type, trigger_config, points, enabled, position").eq("tenant_id", tenantId).order("position"),
    supabase.from("tenant_settings").select("setting_value").eq("tenant_id", tenantId).eq("setting_key", "lead_score_hot_threshold").maybeSingle(),
  ]);
  const hot = Number((setting as any)?.setting_value);
  return { rules: (rules as ScoringRuleView[] | null) ?? [], hotThreshold: Number.isFinite(hot) ? hot : 50 };
}

export async function createScoringRule(
  tenantId: string,
  input: { name: string; trigger_type: TriggerType; trigger_config?: Record<string, unknown>; points: number },
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const name = (input.name || "").trim();
  if (!name) return { ok: false, message: "Rule name is required." };
  if (!TRIGGER_TYPES.includes(input.trigger_type)) return { ok: false, message: "Invalid trigger." };
  const points = Math.trunc(Number(input.points));
  if (!Number.isFinite(points)) return { ok: false, message: "Points must be a number." };

  const supabase = createSupabaseServiceClient();
  const { count } = await supabase.from("tenant_scoring_rules").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const { error } = await supabase.from("tenant_scoring_rules").insert({
    tenant_id: tenantId, name, trigger_type: input.trigger_type, trigger_config: input.trigger_config ?? {}, points, position: count ?? 0,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updateScoringRule(
  tenantId: string, id: string,
  patch: { name?: string; points?: number; enabled?: boolean; trigger_config?: Record<string, unknown> },
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) { const nm = patch.name.trim(); if (!nm) return { ok: false, message: "Rule name is required." }; upd.name = nm; }
  if (patch.points != null) { const p = Math.trunc(Number(patch.points)); if (!Number.isFinite(p)) return { ok: false, message: "Points must be a number." }; upd.points = p; }
  if (patch.enabled != null) upd.enabled = !!patch.enabled;
  if (patch.trigger_config != null) upd.trigger_config = patch.trigger_config;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_scoring_rules").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteScoringRule(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_scoring_rules").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function setHotThreshold(tenantId: string, threshold: number): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const v = Math.max(0, Math.trunc(Number(threshold)));
  if (!Number.isFinite(v)) return { ok: false, message: "Threshold must be a number." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: "lead_score_hot_threshold", setting_value: String(v), updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,setting_key" },
  );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
