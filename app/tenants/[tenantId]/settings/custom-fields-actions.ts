"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Tenant Custom Fields (the market-leading platform parity). Tenant-defined fields on CRM objects (contact /
 * opportunity). Tenant-scoped; admin-gated writes. field_key is a machine slug, unique per object.
 */

export type CustomObjectType = "contact" | "opportunity";
export const FIELD_TYPES = ["text", "textarea", "number", "date", "dropdown", "checkbox", "phone", "email", "url"] as const;
export type CustomFieldType = (typeof FIELD_TYPES)[number];

export interface CustomFieldView {
  id: string;
  object_type: CustomObjectType;
  name: string;
  field_key: string;
  field_type: CustomFieldType;
  options: string[];
  required: boolean;
  position: number;
}

async function requireAdmin(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

export async function listCustomFields(tenantId: string): Promise<CustomFieldView[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_custom_fields")
    .select("id, object_type, name, field_key, field_type, options, required, position")
    .eq("tenant_id", tenantId)
    .order("object_type")
    .order("position");
  return ((data as any[] | null) ?? []).map((r) => ({
    ...r,
    options: Array.isArray(r.options) ? r.options.map(String) : [],
  })) as CustomFieldView[];
}

export async function createCustomField(
  tenantId: string,
  input: { object_type: CustomObjectType; name: string; field_type: CustomFieldType; options?: string[]; required?: boolean },
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const name = (input.name || "").trim();
  if (!name) return { ok: false, message: "Field name is required." };
  if (!FIELD_TYPES.includes(input.field_type)) return { ok: false, message: "Invalid field type." };
  const objectType: CustomObjectType = input.object_type === "opportunity" ? "opportunity" : "contact";
  const field_key = slugify(name);
  if (!field_key) return { ok: false, message: "Field name must contain letters or numbers." };
  const options = input.field_type === "dropdown" ? (input.options ?? []).map((s) => s.trim()).filter(Boolean) : [];
  if (input.field_type === "dropdown" && options.length === 0) return { ok: false, message: "Add at least one dropdown option." };

  const supabase = createSupabaseServiceClient();
  const { count } = await supabase.from("tenant_custom_fields").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("object_type", objectType);
  const { error } = await supabase.from("tenant_custom_fields").insert({
    tenant_id: tenantId, object_type: objectType, name, field_key,
    field_type: input.field_type, options, required: !!input.required, position: count ?? 0,
  });
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "A field with that name already exists for this object." : error.message };
  return { ok: true };
}

export async function updateCustomField(
  tenantId: string, id: string,
  patch: { name?: string; field_type?: CustomFieldType; options?: string[]; required?: boolean },
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) { const nm = patch.name.trim(); if (!nm) return { ok: false, message: "Field name is required." }; upd.name = nm; }
  if (patch.field_type != null) { if (!FIELD_TYPES.includes(patch.field_type)) return { ok: false, message: "Invalid field type." }; upd.field_type = patch.field_type; }
  if (patch.options != null) upd.options = patch.options.map((s) => s.trim()).filter(Boolean);
  if (patch.required != null) upd.required = !!patch.required;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_custom_fields").update(upd).eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteCustomField(tenantId: string, id: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdmin(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_custom_fields").delete().eq("tenant_id", tenantId).eq("id", id);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
