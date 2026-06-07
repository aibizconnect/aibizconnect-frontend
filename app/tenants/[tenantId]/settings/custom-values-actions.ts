"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Tenant Custom Values (the market-leading platform parity): named reusable values referenced as
 * {{custom_values.<key>}} in emails and pages. Tenant-scoped; admin-gated writes. Keys are unique
 * per tenant (case-insensitive).
 */

export interface CustomValueView { id: string; name: string; value_key: string; value: string }

async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}
function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

export async function listCustomValues(tenantId: string): Promise<CustomValueView[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_custom_values").select("id, name, value_key, value").eq("tenant_id", tenantId).order("name");
  return (data as CustomValueView[] | null) ?? [];
}

export async function createCustomValue(tenantId: string, name: string, value: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const nm = (name || "").trim();
  if (!nm) return { ok: false, message: "Name is required." };
  const value_key = slugify(nm);
  if (!value_key) return { ok: false, message: "Name must contain letters or numbers." };
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_custom_values").insert({ tenant_id: tenantId, name: nm, value_key, value: (value || "").trim() });
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "A value with that name already exists." : error.message };
  return { ok: true };
}

export async function updateCustomValue(tenantId: string, id: string, patch: { name?: string; value?: string }): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) { const nm = patch.name.trim(); if (!nm) return { ok: false, message: "Name is required." }; upd.name = nm; upd.value_key = slugify(nm); }
  if (patch.value != null) upd.value = patch.value.trim();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_custom_values").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "A value with that name already exists." : error.message };
  return { ok: true };
}

export async function deleteCustomValue(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_custom_values").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
