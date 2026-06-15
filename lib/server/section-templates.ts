import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createHash } from "node:crypto";
import type { SectionContent } from "@/lib/sections/schemas";

/**
 * Section Template library store (D-363..367). Reusable SECTION templates — Header/Hero/About/Team/
 * CTA/Form/Features/Testimonials/Footer — produced by the Stitch factory or seeded from the static
 * PREBUILT_TEMPLATES. tenant_id NULL = system/shared. Dedup by a content hash of `sections` (ids
 * stripped). Backed by website_section_templates (migration 0073); degrades to empty pre-DDL.
 */

export interface TemplateManifest {
  name: string; category: string; intent?: string; variant?: string;
  colorMode?: "light" | "dark" | "neutral"; blurb?: string; thumbnailUrl?: string;
  generatedBy?: string; generatedAt?: string;
}
export interface SectionTemplate { id: string; tenantId: string | null; manifest: TemplateManifest; sections: SectionContent[]; status: string }

const svc = () => createSupabaseServiceClient();
const missingTable = (m?: string) => /relation .* does not exist|Could not find the table/i.test(m ?? "");

/** Strip volatile ids/uids so two identical designs hash the same. */
function stripIds(v: any): any {
  if (Array.isArray(v)) return v.map(stripIds);
  if (v && typeof v === "object") { const o: any = {}; for (const k of Object.keys(v)) { if (k === "id" || k === "uid" || k === "_uid") continue; o[k] = stripIds(v[k]); } return o; }
  return v;
}
const hashSections = (sections: unknown) => createHash("sha256").update(JSON.stringify(stripIds(sections))).digest("hex");
const rowTo = (r: any): SectionTemplate => ({ id: r.id, tenantId: r.tenant_id ?? null, manifest: (r.manifest ?? {}) as TemplateManifest, sections: Array.isArray(r.sections) ? r.sections : [], status: r.status ?? "active" });

export async function listSectionTemplates(opts: { tenantId?: string | null; category?: string; status?: string } = {}): Promise<SectionTemplate[]> {
  let q = svc().from("website_section_templates").select("id, tenant_id, manifest, sections, status").order("created_at", { ascending: false });
  if (opts.tenantId) q = q.or(`tenant_id.is.null,tenant_id.eq.${opts.tenantId}`); else q = q.is("tenant_id", null);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, error } = await q;
  if (error) return [];
  let rows = (data ?? []).map(rowTo);
  if (opts.category) rows = rows.filter((r) => r.manifest.category === opts.category);
  return rows;
}

export async function createSectionTemplate(input: { tenantId?: string | null; manifest: TemplateManifest; sections: SectionContent[]; status?: string }): Promise<{ ok: boolean; id?: string; error?: string; duplicate?: boolean }> {
  if (!Array.isArray(input.sections) || input.sections.length === 0) return { ok: false, error: "A template needs at least one section." };
  const row = {
    tenant_id: input.tenantId ?? null,
    manifest: { generatedBy: "factory", generatedAt: new Date().toISOString(), ...input.manifest },
    sections: input.sections, content_hash: hashSections(input.sections), status: input.status ?? "active", updated_at: new Date().toISOString(),
  };
  const { data, error } = await svc().from("website_section_templates").insert(row).select("id").single();
  if (error) {
    if (/duplicate key|unique/i.test(error.message)) return { ok: false, duplicate: true, error: "That design is already in the library." };
    return { ok: false, error: missingTable(error.message) ? "Run migration 0073_website_section_templates.sql first." : error.message };
  }
  return { ok: true, id: data?.id };
}

export async function setTemplateStatus(id: string, status: string): Promise<void> {
  await svc().from("website_section_templates").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
}
export async function deleteSectionTemplate(id: string): Promise<void> {
  await svc().from("website_section_templates").delete().eq("id", id);
}

/** One-time/idempotent: import the static PREBUILT_TEMPLATES as system-owned rows (dedup by hash). */
export async function seedFromPrebuilts(): Promise<{ inserted: number; skipped: number; error?: string }> {
  const { PREBUILT_TEMPLATES } = await import("@/lib/sections/prebuilt-templates");
  let inserted = 0, skipped = 0;
  for (const t of PREBUILT_TEMPLATES) {
    const r = await createSectionTemplate({ tenantId: null, status: "active", sections: t.sections as SectionContent[], manifest: { name: t.name, category: t.category, blurb: t.blurb, generatedBy: "prebuilt-seed" } });
    if (r.ok) inserted++;
    else { skipped++; if (r.error && !r.duplicate) return { inserted, skipped, error: r.error }; }
  }
  return { inserted, skipped };
}
