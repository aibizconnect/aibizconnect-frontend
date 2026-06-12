import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createContact, updateContact, addContactNote } from "@/lib/crm";

/**
 * CONTACT / CRM tools for AI agents (D-275 — "complete everything, not placeholders").
 * Same contract as calendar-tools: zod-validated args, audited, ToolResult union.
 * contacts.find is READ; create/update/addTag/addNote are WRITE (live-gated upstream).
 * Tags respect Ali's registry law: a tag applied by an agent is CREATED in tenant_tags
 * if it doesn't exist yet (D-265).
 */

type ToolResult<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const audit = async (tenantId: string, op: string, meta: Record<string, unknown>) => {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action: `agent.contacts.${op}`, actorEmail: null, meta: { tenantId, ...meta } });
  } catch { /* best effort */ }
};

const svc = () => createSupabaseServiceClient();
const CONTACT_COLS = "id, name, email, phone, company, source, tags, created_at";
const shape = (r: any) => ({
  id: r.id as string, name: (r.name ?? null) as string | null, email: (r.email ?? null) as string | null,
  phone: (r.phone ?? null) as string | null, company: (r.company ?? null) as string | null,
  tags: (Array.isArray(r.tags) ? r.tags : []) as string[],
});

// ── find (READ) ──────────────────────────────────────────────────────────────
const findSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  name: z.string().min(2).optional(),
}).refine((v) => v.email || v.phone || v.name, { message: "Provide email, phone, or name." });

export async function toolFindContacts(tenantId: string, raw: unknown): Promise<ToolResult<ReturnType<typeof shape>[]>> {
  const p = findSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  let q = svc().from("tenant_contacts").select(CONTACT_COLS).eq("tenant_id", tenantId).limit(10);
  if (p.data.email) q = q.ilike("email", p.data.email);
  else if (p.data.phone) q = q.ilike("phone", `%${p.data.phone.replace(/[^\d+]/g, "").slice(-10)}%`);
  else if (p.data.name) q = q.ilike("name", `%${p.data.name}%`);
  const { data, error } = await q;
  if (error) return fail(error.message);
  await audit(tenantId, "find", { by: p.data.email ? "email" : p.data.phone ? "phone" : "name", found: (data ?? []).length });
  return { ok: true, data: (data ?? []).map(shape) };
}

// ── create (WRITE) ───────────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  company: z.string().max(120).optional(),
  source: z.string().max(60).optional(),
}).refine((v) => v.email || v.phone, { message: "A contact needs an email or a phone number." });

export async function toolCreateContact(tenantId: string, raw: unknown): Promise<ToolResult<{ created: boolean; existingId?: string }>> {
  const p = createSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  // Dedupe by email first (same rule as CSV import) — agents must not spawn duplicates.
  if (p.data.email) {
    const { data: ex } = await svc().from("tenant_contacts").select("id").eq("tenant_id", tenantId).ilike("email", p.data.email).maybeSingle();
    if (ex) { await audit(tenantId, "create", { dedupe: true }); return { ok: true, data: { created: false, existingId: (ex as any).id } }; }
  }
  const r = await createContact(tenantId, { ...p.data, source: p.data.source ?? "ai_agent" });
  if (!r.ok) return fail(r.error ?? "Could not create the contact.");
  await audit(tenantId, "create", { email: p.data.email ?? null, phone: p.data.phone ?? null });
  return { ok: true, data: { created: true } };
}

// ── update (WRITE, fill-empty discipline for identity fields) ────────────────
const updateSchema = z.object({
  contactId: z.string().uuid(),
  name: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  company: z.string().max(120).optional(),
});

export async function toolUpdateContact(tenantId: string, raw: unknown): Promise<ToolResult<{ updated: true }>> {
  const p = updateSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  const { contactId, ...patch } = p.data;
  if (!Object.keys(patch).length) return fail("Nothing to update.");
  const r = await updateContact(tenantId, contactId, patch);
  if (!r.ok) return fail(r.error ?? "Could not update the contact.");
  await audit(tenantId, "update", { contactId, fields: Object.keys(patch) });
  return { ok: true, data: { updated: true } };
}

// ── addTag (WRITE; registry-creating per D-265) ──────────────────────────────
const tagSchema = z.object({ contactId: z.string().uuid(), tag: z.string().min(1).max(40) });

export async function toolAddContactTag(tenantId: string, raw: unknown): Promise<ToolResult<{ tagged: true; tagCreated: boolean }>> {
  const p = tagSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  const sb = svc();
  const tag = p.data.tag.trim();
  // Registry: create the tag if it's new (case-insensitive unique per tenant).
  const { data: existing } = await sb.from("tenant_tags").select("id, name").eq("tenant_id", tenantId).ilike("name", tag).maybeSingle();
  let tagCreated = false;
  let canonical = (existing as any)?.name as string | undefined;
  if (!canonical) {
    const ins = await sb.from("tenant_tags").insert({ tenant_id: tenantId, name: tag });
    tagCreated = !ins.error;
    canonical = tag;
  }
  const { data: c, error } = await sb.from("tenant_contacts").select("id, tags").eq("tenant_id", tenantId).eq("id", p.data.contactId).maybeSingle();
  if (error || !c) return fail("Contact not found.");
  const tags: string[] = Array.isArray((c as any).tags) ? (c as any).tags : [];
  if (!tags.some((t) => t.toLowerCase() === canonical!.toLowerCase())) {
    const { error: e2 } = await sb.from("tenant_contacts").update({ tags: [...tags, canonical] }).eq("id", p.data.contactId);
    if (e2) return fail(e2.message);
  }
  await audit(tenantId, "tag", { contactId: p.data.contactId, tag: canonical, tagCreated });
  return { ok: true, data: { tagged: true, tagCreated } };
}

// ── addNote (WRITE) ──────────────────────────────────────────────────────────
const noteSchema = z.object({ contactId: z.string().uuid(), note: z.string().min(2).max(2000) });

export async function toolAddContactNote(tenantId: string, raw: unknown): Promise<ToolResult<{ noted: true }>> {
  const p = noteSchema.safeParse(raw);
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Invalid arguments.");
  const r = await addContactNote(tenantId, p.data.contactId, p.data.note, "ai-agent");
  if (!r.ok) return fail(r.error ?? "Could not add the note.");
  await audit(tenantId, "note", { contactId: p.data.contactId });
  return { ok: true, data: { noted: true } };
}

export const CONTACT_TOOL_MANIFEST = [
  { name: "contacts.find", description: "Find CRM contacts by email, phone, or name (max 10).", params: { email: "optional", phone: "optional", name: "optional (one required)" } },
  { name: "contacts.create", description: "Create a CRM contact (deduped by email; source defaults to ai_agent).", params: { name: "", email: "optional", phone: "optional (email or phone required)", company: "optional", source: "optional" } },
  { name: "contacts.update", description: "Update a contact's name/email/phone/company.", params: { contactId: "uuid", name: "optional", email: "optional", phone: "optional", company: "optional" } },
  { name: "contacts.addTag", description: "Tag a contact. New tags are created in the tenant's tag registry automatically.", params: { contactId: "uuid", tag: "tag name" } },
  { name: "contacts.addNote", description: "Add a note to a contact's timeline.", params: { contactId: "uuid", note: "" } },
] as const;
