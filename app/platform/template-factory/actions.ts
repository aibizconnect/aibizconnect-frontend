"use server";

import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import {
  listSectionTemplates, setTemplateStatus, deleteSectionTemplate, seedFromPrebuilts, createSectionTemplate,
  type SectionTemplate,
} from "@/lib/server/section-templates";

/** Section Template Factory actions (D-363..367) — platform-admin only. */
async function gate() { if (!(await isPlatformAdmin())) throw new Error("Platform admin only."); }

export async function listTemplatesAction(): Promise<SectionTemplate[]> { await gate(); return listSectionTemplates({ tenantId: null }); }

export async function seedPrebuiltsAction(): Promise<{ ok: boolean; inserted?: number; skipped?: number; error?: string }> {
  await gate();
  const r = await seedFromPrebuilts();
  return r.error ? { ok: false, error: r.error } : { ok: true, inserted: r.inserted, skipped: r.skipped };
}

export async function setStatusAction(id: string, status: string): Promise<{ ok: boolean }> { await gate(); await setTemplateStatus(id, status); return { ok: true }; }
export async function deleteTemplateAction(id: string): Promise<{ ok: boolean }> { await gate(); await deleteSectionTemplate(id); return { ok: true }; }

/** Manual import: paste a translated SectionContent[] (or one section) → store as a template. The
 *  automated Gemini→Stitch→render-bridge path lands here too once wired (agent-driven for now). */
export async function importTemplateAction(input: { name: string; category: string; json: string }): Promise<{ ok: boolean; error?: string; duplicate?: boolean }> {
  await gate();
  let parsed: unknown;
  try { parsed = JSON.parse(input.json); } catch { return { ok: false, error: "That isn't valid JSON." }; }
  const sections = (Array.isArray(parsed) ? parsed : [parsed]) as any[];
  if (!sections.length || !sections.every((s) => s && typeof s === "object" && typeof s.type === "string")) {
    return { ok: false, error: "Each section must be an object with a string `type`." };
  }
  const r = await createSectionTemplate({ tenantId: null, sections, status: "active", manifest: { name: input.name?.trim() || "Imported section", category: input.category || "Content", generatedBy: "import" } });
  return r.ok ? { ok: true } : { ok: false, error: r.error, duplicate: r.duplicate };
}
