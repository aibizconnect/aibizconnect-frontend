"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Tenant CRM Tags (the market-leading platform parity). Tenant-scoped; admin-gated writes. Names are unique per
 * tenant (case-insensitive, enforced by the DB index). Reusable labels for contacts/opportunities.
 */

export interface TagView { id: string; name: string; color: string; created_at: string }

async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export async function listTags(tenantId: string): Promise<TagView[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_tags").select("id, name, color, created_at").eq("tenant_id", tenantId).order("name");
  return (data as TagView[] | null) ?? [];
}

export async function createTag(tenantId: string, name: string, color: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const nm = (name || "").trim();
  if (!nm) return { ok: false, message: "Tag name is required." };
  const col = /^#[0-9a-fA-F]{6}$/.test((color || "").trim()) ? color.trim() : "#1e3a8a";
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_tags").insert({ tenant_id: tenantId, name: nm, color: col });
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "That tag already exists." : error.message };
  return { ok: true };
}

export async function updateTag(tenantId: string, id: string, patch: { name?: string; color?: string }): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) { const nm = patch.name.trim(); if (!nm) return { ok: false, message: "Tag name is required." }; upd.name = nm; }
  if (patch.color != null && /^#[0-9a-fA-F]{6}$/.test(patch.color.trim())) upd.color = patch.color.trim();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_tags").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "That tag already exists." : error.message };
  return { ok: true };
}

export async function deleteTag(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_tags").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
