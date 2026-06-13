import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Forms module (D-311..315) — a management surface over the existing form_submissions store.
 * tenant_forms holds the definition (fields + settings); a public hosted page /f/[id] renders
 * it and posts to /api/leads/submit (which stamps form_id). SERVER-ONLY. Surveys deferred.
 * Graceful missing-table degradation until migration 0059 is applied.
 */

export type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "number" | "date";
export interface FormField { key: string; label: string; type: FieldType; required: boolean; placeholder?: string; options?: string[]; order?: number; }
export interface FormSettings { submitButtonText: string; thankYouMessage: string; redirectUrl?: string | null; }
export interface FormDef {
  id: string; name: string; kind: "form" | "survey"; fields: FormField[]; settings: FormSettings;
  status: "draft" | "published" | "archived"; createdAt: string; submissionCount?: number;
}
export interface Submission { id: string; data: Record<string, string>; sourceUrl: string | null; createdAt: string; }

const svc = () => createSupabaseServiceClient();
const DEFAULT_SETTINGS: FormSettings = { submitButtonText: "Submit", thankYouMessage: "Thank you — we'll be in touch shortly.", redirectUrl: null };
export const DEFAULT_FIELDS: FormField[] = [
  { key: "name", label: "Full name", type: "text", required: true, order: 0 },
  { key: "email", label: "Email", type: "email", required: true, order: 1 },
  { key: "phone", label: "Phone", type: "phone", required: false, order: 2 },
  { key: "message", label: "How can we help?", type: "textarea", required: false, order: 3 },
];

function rowToForm(r: any, count?: number): FormDef {
  return {
    id: r.id, name: r.name ?? "Untitled form", kind: r.kind === "survey" ? "survey" : "form",
    fields: Array.isArray(r.fields) ? r.fields : [],
    settings: { ...DEFAULT_SETTINGS, ...(r.settings && typeof r.settings === "object" ? r.settings : {}) },
    status: r.status ?? "draft", createdAt: r.created_at, submissionCount: count,
  };
}

export async function listForms(tenantId: string): Promise<FormDef[]> {
  const { data, error } = await svc().from("tenant_forms").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error || !data) return [];
  // tally submission counts per form in one pass
  const counts = new Map<string, number>();
  const { data: subs } = await svc().from("form_submissions").select("form_id").eq("tenant_id", tenantId).not("form_id", "is", null);
  (subs ?? []).forEach((s: any) => counts.set(s.form_id, (counts.get(s.form_id) ?? 0) + 1));
  return data.map((r: any) => rowToForm(r, counts.get(r.id) ?? 0));
}
export async function getForm(tenantId: string, id: string): Promise<FormDef | null> {
  const { data, error } = await svc().from("tenant_forms").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToForm(data);
}
/** Public fetch by id (no tenant scope) for the hosted /f/[id] page — returns tenantId too. */
export async function getFormPublic(id: string): Promise<{ tenantId: string; form: FormDef } | null> {
  const { data, error } = await svc().from("tenant_forms").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return { tenantId: data.tenant_id, form: rowToForm(data) };
}
export async function createForm(tenantId: string, input: { name: string; kind?: "form" | "survey"; fields?: FormField[]; settings?: Partial<FormSettings> }): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await svc().from("tenant_forms").insert({
    tenant_id: tenantId, name: input.name || "Untitled form", kind: input.kind ?? "form",
    fields: input.fields ?? DEFAULT_FIELDS, settings: { ...DEFAULT_SETTINGS, ...(input.settings ?? {}) }, status: "draft",
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message };
  return { ok: true, id: data.id };
}
export async function updateForm(tenantId: string, id: string, patch: { name?: string; fields?: FormField[]; settings?: FormSettings; status?: string }): Promise<{ ok: boolean; error?: string }> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.fields !== undefined) row.fields = patch.fields;
  if (patch.settings !== undefined) row.settings = patch.settings;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await svc().from("tenant_forms").update(row).eq("tenant_id", tenantId).eq("id", id);
  return { ok: !error, error: error?.message };
}
export async function deleteForm(tenantId: string, id: string): Promise<void> {
  await svc().from("tenant_forms").delete().eq("tenant_id", tenantId).eq("id", id);
}
export async function listSubmissions(tenantId: string, formId: string, limit = 200): Promise<Submission[]> {
  const { data, error } = await svc().from("form_submissions").select("id, data, source_url, created_at").eq("tenant_id", tenantId).eq("form_id", formId).order("created_at", { ascending: false }).limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({ id: r.id, data: (r.data && typeof r.data === "object") ? r.data : {}, sourceUrl: r.source_url ?? null, createdAt: r.created_at }));
}
