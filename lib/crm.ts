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

/** Full contact (GHL-parity, D-228): adds created/company/owner/DND/custom-field values.
 *  Pre-0045 rows surface with safe defaults. */
export interface ContactFull extends Contact {
  createdAt: string | null;
  company: string | null;
  ownerEmail: string | null;
  dnd: boolean;
  custom: Record<string, unknown>;
}
function rowToContact(r: any): ContactFull {
  return {
    id: r.id, name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "",
    tags: r.tags ?? [], score: r.score ?? 0, source: r.source ?? null,
    createdAt: r.created_at ?? null, company: r.company ?? null,
    ownerEmail: r.owner_email ?? null, dnd: !!r.dnd,
    custom: r.custom && typeof r.custom === "object" ? r.custom : {},
  };
}
const CRM_MIGRATION_HINT = "Contacts upgrade pending — run supabase/migrations/0045_contacts_parity.sql first.";
const missingColOrTable = (msg?: string) => !!msg && /column .* does not exist|could not find|relation .* does not exist|schema cache/i.test(msg);

// ---- contacts ----
export async function listContacts(tenantId: string): Promise<Contact[]> {
  const { data } = await service().from("tenant_contacts").select("id,name,email,phone,tags,score,source").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name ?? "", email: r.email ?? "", phone: r.phone ?? "", tags: r.tags ?? [], score: r.score ?? 0, source: r.source }));
}
export async function createContact(tenantId: string, c: { name?: string; email?: string; phone?: string; source?: string; tags?: string[]; company?: string }): Promise<{ ok: boolean; error?: string }> {
  const base: Record<string, unknown> = { tenant_id: tenantId, name: c.name ?? "", email: c.email ?? "", phone: c.phone ?? "", source: c.source ?? "manual", ...(c.tags?.length ? { tags: c.tags } : {}) };
  let { error } = await service().from("tenant_contacts").insert(c.company ? { ...base, company: c.company } : base);
  if (error && c.company && /column .* does not exist|could not find|schema cache/i.test(error.message)) {
    ({ error } = await service().from("tenant_contacts").insert(base)); // company column pre-0045
  }
  return { ok: !error, error: error?.message };
}
export async function deleteContact(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_contacts").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ── GHL-parity contacts API (D-229) ─────────────────────────────────────────

export interface ContactFilters {
  q?: string;                 // searches name / email / phone / company
  tags?: string[];            // overlap match
  source?: string;
  createdFrom?: string;       // ISO date
  createdTo?: string;
  sort?: "name" | "created_at" | "score";
  dir?: "asc" | "desc";
  page?: number;              // 0-based
  pageSize?: number;          // default 50
}

/** Server-side searched/filtered/sorted/paginated contact page (CON-V3). */
export async function listContactsPage(tenantId: string, f: ContactFilters = {}): Promise<{ rows: ContactFull[]; total: number }> {
  const pageSize = Math.min(f.pageSize ?? 50, 1000);
  const page = Math.max(0, f.page ?? 0);
  let q = service().from("tenant_contacts").select("*", { count: "exact" }).eq("tenant_id", tenantId);
  const term = (f.q ?? "").trim().replace(/[%,()]/g, "");
  if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  // Live `tags` is JSONB (created from the older queued SQL), so array `overlaps` doesn't
  // exist — use jsonb containment, OR'd per tag for GHL's any-of semantics.
  if (f.tags?.length) {
    const safe = f.tags.map((t) => t.replace(/[",]/g, "").trim()).filter(Boolean);
    if (safe.length === 1) q = q.contains("tags", JSON.stringify(safe));
    else if (safe.length) q = q.or(safe.map((t) => `tags.cs.${JSON.stringify([t])}`).join(","));
  }
  if (f.source) q = q.eq("source", f.source);
  if (f.createdFrom) q = q.gte("created_at", f.createdFrom);
  if (f.createdTo) q = q.lt("created_at", f.createdTo);
  q = q.order(f.sort ?? "created_at", { ascending: f.dir ? f.dir === "asc" : (f.sort === "name") });
  q = q.range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, count, error } = await q;
  if (error) return { rows: [], total: 0 };
  return { rows: (data ?? []).map(rowToContact), total: count ?? 0 };
}

export async function getContact(tenantId: string, id: string): Promise<ContactFull | null> {
  const { data } = await service().from("tenant_contacts").select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
  return data ? rowToContact(data) : null;
}

export interface ContactPatch {
  name?: string; email?: string; phone?: string; source?: string; score?: number; tags?: string[];
  company?: string; ownerEmail?: string; dnd?: boolean; custom?: Record<string, unknown>;
}
export async function updateContact(tenantId: string, id: string, patch: ContactPatch): Promise<{ ok: boolean; error?: string }> {
  const core: Record<string, unknown> = {};
  if (patch.name != null) core.name = patch.name;
  if (patch.email != null) core.email = patch.email;
  if (patch.phone != null) core.phone = patch.phone;
  if (patch.source != null) core.source = patch.source;
  if (patch.score != null) core.score = patch.score;
  if (patch.tags != null) core.tags = patch.tags;
  const extended: Record<string, unknown> = { ...core, updated_at: new Date().toISOString() };
  if (patch.company != null) extended.company = patch.company;
  if (patch.ownerEmail != null) extended.owner_email = patch.ownerEmail;
  if (patch.dnd != null) extended.dnd = patch.dnd;
  if (patch.custom != null) extended.custom = patch.custom;
  let { error } = await service().from("tenant_contacts").update(extended).eq("tenant_id", tenantId).eq("id", id);
  if (error && missingColOrTable(error.message)) {
    // 0045 not applied yet → save the core fields; extended ones report the hint.
    ({ error } = await service().from("tenant_contacts").update(core).eq("tenant_id", tenantId).eq("id", id));
    if (!error && (patch.company != null || patch.ownerEmail != null || patch.dnd != null || patch.custom != null)) {
      return { ok: false, error: CRM_MIGRATION_HINT };
    }
  }
  return { ok: !error, error: error?.message };
}

/** Bulk add/remove one tag across many contacts (bulk bar). */
export async function bulkTagContacts(tenantId: string, ids: string[], tag: string, mode: "add" | "remove"): Promise<{ ok: boolean; error?: string; changed: number }> {
  const t = tag.trim();
  if (!t || !ids.length) return { ok: true, changed: 0 };
  const sb = service();
  const { data, error } = await sb.from("tenant_contacts").select("id,tags").eq("tenant_id", tenantId).in("id", ids);
  if (error) return { ok: false, error: error.message, changed: 0 };
  let changed = 0;
  for (const r of data ?? []) {
    const tags: string[] = r.tags ?? [];
    const next = mode === "add"
      ? (tags.includes(t) ? tags : [...tags, t])
      : tags.filter((x) => x !== t);
    if (next.length !== tags.length || (mode === "add" && !tags.includes(t))) {
      const { error: e2 } = await sb.from("tenant_contacts").update({ tags: next }).eq("tenant_id", tenantId).eq("id", r.id);
      if (!e2) changed++;
    }
  }
  return { ok: true, changed };
}

export async function bulkDeleteContacts(tenantId: string, ids: string[]): Promise<{ ok: boolean; error?: string; deleted: number }> {
  if (!ids.length) return { ok: true, deleted: 0 };
  const { error, count } = await service().from("tenant_contacts").delete({ count: "exact" }).eq("tenant_id", tenantId).in("id", ids);
  return { ok: !error, error: error?.message, deleted: count ?? 0 };
}

/** CSV import (CON-V5): inserts rows, dedupes by email (existing emails are skipped). */
export async function importContacts(
  tenantId: string,
  rows: { name?: string; email?: string; phone?: string; company?: string; tags?: string[]; source?: string }[],
): Promise<{ ok: boolean; error?: string; inserted: number; skipped: number }> {
  const sb = service();
  const clean = rows
    .map((r) => ({ name: (r.name ?? "").trim(), email: (r.email ?? "").trim().toLowerCase(), phone: (r.phone ?? "").trim(), company: (r.company ?? "").trim(), tags: r.tags ?? [], source: r.source || "import" }))
    .filter((r) => r.name || r.email || r.phone);
  if (!clean.length) return { ok: true, inserted: 0, skipped: 0 };
  const emails = Array.from(new Set(clean.map((r) => r.email).filter(Boolean)));
  const existing = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data } = await sb.from("tenant_contacts").select("email").eq("tenant_id", tenantId).in("email", emails.slice(i, i + 200));
    for (const r of data ?? []) if (r.email) existing.add(String(r.email).toLowerCase());
  }
  const seen = new Set<string>();
  const toInsert = clean.filter((r) => {
    if (!r.email) return true;
    if (existing.has(r.email) || seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200).map((r) => ({ tenant_id: tenantId, name: r.name, email: r.email, phone: r.phone, tags: r.tags, source: r.source, ...(r.company ? { company: r.company } : {}) }));
    let { error } = await sb.from("tenant_contacts").insert(chunk);
    if (error && missingColOrTable(error.message)) {
      // company column not applied yet → import without it.
      ({ error } = await sb.from("tenant_contacts").insert(chunk.map(({ ...c }: any) => { delete c.company; return c; })));
    }
    if (error) return { ok: false, error: error.message, inserted, skipped: clean.length - toInsert.length };
    inserted += chunk.length;
  }
  return { ok: true, inserted, skipped: clean.length - toInsert.length };
}

// ── tags + custom fields (read; managed elsewhere) ──────────────────────────
export async function listTags(tenantId: string): Promise<{ id: string; name: string; color: string }[]> {
  const { data } = await service().from("tenant_tags").select("id,name,color").eq("tenant_id", tenantId).order("name");
  return (data ?? []) as any;
}
export interface CustomFieldDef { id: string; name: string; fieldKey: string; fieldType: string; options: string[]; position: number }
export async function listCustomFields(tenantId: string, objectType = "contact"): Promise<CustomFieldDef[]> {
  const { data } = await service().from("tenant_custom_fields").select("id,name,field_key,field_type,options,position").eq("tenant_id", tenantId).eq("object_type", objectType).order("position");
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, fieldKey: r.field_key, fieldType: r.field_type, options: Array.isArray(r.options) ? r.options : [], position: r.position ?? 0 }));
}

// ── notes (CON-V7) ──────────────────────────────────────────────────────────
export interface ContactNote { id: string; body: string; authorEmail: string | null; createdAt: string }
export async function listContactNotes(tenantId: string, contactId: string): Promise<ContactNote[]> {
  const { data, error } = await service().from("tenant_contact_notes").select("*").eq("tenant_id", tenantId).eq("contact_id", contactId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, body: r.body, authorEmail: r.author_email ?? null, createdAt: r.created_at }));
}
export async function addContactNote(tenantId: string, contactId: string, body: string, authorEmail?: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_contact_notes").insert({ tenant_id: tenantId, contact_id: contactId, body: body.trim(), author_email: authorEmail || null });
  if (error) return { ok: false, error: missingColOrTable(error.message) ? CRM_MIGRATION_HINT : error.message };
  return { ok: true };
}
export async function deleteContactNote(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_contact_notes").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ── tasks (CON-V8) ──────────────────────────────────────────────────────────
export interface ContactTask { id: string; contactId: string | null; title: string; dueAt: string | null; status: "open" | "done"; assigneeEmail: string | null; createdAt: string }
export async function listContactTasks(tenantId: string, opts: { contactId?: string; status?: "open" | "done" } = {}): Promise<ContactTask[]> {
  let q = service().from("tenant_contact_tasks").select("*").eq("tenant_id", tenantId).order("due_at", { ascending: true, nullsFirst: false });
  if (opts.contactId) q = q.eq("contact_id", opts.contactId);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, contactId: r.contact_id ?? null, title: r.title, dueAt: r.due_at ?? null, status: r.status === "done" ? "done" : "open", assigneeEmail: r.assignee_email ?? null, createdAt: r.created_at }));
}
export async function addContactTask(tenantId: string, input: { contactId?: string; title: string; dueAt?: string; assigneeEmail?: string }): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_contact_tasks").insert({ tenant_id: tenantId, contact_id: input.contactId || null, title: input.title.trim(), due_at: input.dueAt || null, assignee_email: input.assigneeEmail || null });
  if (error) return { ok: false, error: missingColOrTable(error.message) ? CRM_MIGRATION_HINT : error.message };
  return { ok: true };
}
export async function setContactTaskStatus(tenantId: string, id: string, status: "open" | "done"): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_contact_tasks").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("id", id);
  return { ok: !error, error: error?.message };
}
export async function deleteContactTask(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_contact_tasks").delete().eq("tenant_id", tenantId).eq("id", id);
}

// ── smart lists (CON-V9): saved filter views ────────────────────────────────
export interface SmartList { id: string; name: string; filters: ContactFilters; position: number }
export async function listSmartLists(tenantId: string): Promise<SmartList[]> {
  const { data, error } = await service().from("tenant_smart_lists").select("*").eq("tenant_id", tenantId).order("position").order("created_at");
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, filters: r.filters ?? {}, position: r.position ?? 0 }));
}
export async function createSmartList(tenantId: string, name: string, filters: ContactFilters): Promise<{ ok: boolean; error?: string }> {
  const { error } = await service().from("tenant_smart_lists").insert({ tenant_id: tenantId, name: name.trim() || "Smart list", filters });
  if (error) return { ok: false, error: missingColOrTable(error.message) ? CRM_MIGRATION_HINT : error.message };
  return { ok: true };
}
export async function deleteSmartList(tenantId: string, id: string): Promise<void> {
  await service().from("tenant_smart_lists").delete().eq("tenant_id", tenantId).eq("id", id);
}

/** A contact's appointments, matched by email (the calendar v1 link). */
export async function listAppointmentsByEmail(tenantId: string, email: string): Promise<{ id: string; title: string | null; startAt: string; endAt: string | null; status: string; calendarId: string }[]> {
  if (!email) return [];
  const { data, error } = await service().from("tenant_appointments").select("*").eq("tenant_id", tenantId).eq("email", email).order("start_at", { ascending: false }).limit(25);
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, title: r.title ?? null, startAt: r.start_at, endAt: r.end_at ?? null, status: r.status, calendarId: r.calendar_id }));
}

/** Opportunities linked to a contact. */
export async function listOpportunitiesForContact(tenantId: string, contactId: string): Promise<Opportunity[]> {
  const { data, error } = await service().from("tenant_opportunities").select("id,name,value,stage,status,contact_id").eq("tenant_id", tenantId).eq("contact_id", contactId).order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, value: Number(r.value) || 0, stage: r.stage, status: r.status, contact_id: r.contact_id }));
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
