"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getRecipe } from "@/lib/sections/layout-recipes";
import { generateSection, type FillProfile } from "@/lib/sections/fill-slots";
import { getArchetype } from "@/lib/sites/page-archetypes";
import { buildPage } from "@/lib/sites/page-builder";
import { mergeBrandRows } from "@/lib/sections/theme";
import { recordAiUsage } from "../actions";

/** Best-effort business profile from a tenant's brand settings (shared by recipe + page gen). */
async function profileForTenant(tenantId: string): Promise<FillProfile> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data: rows } = await supabase
      .from("website_brand_settings")
      .select("tone, theme")
      .eq("tenant_id", tenantId);
    const brand = mergeBrandRows(Array.isArray(rows) ? rows : []);
    const theme = (brand?.theme && typeof brand.theme === "object" ? brand.theme : {}) as any;
    const biz = theme?.business ?? theme?.site ?? {};
    return {
      businessName: biz?.name || brand?.business_name || brand?.name || undefined,
      industry: biz?.industry || undefined,
      tone: brand?.tone || undefined,
      city: biz?.city || biz?.location || undefined,
      services: Array.isArray(biz?.services) ? biz.services.slice(0, 8) : undefined,
      about: biz?.about || biz?.description || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Phase-3: AI-fill a layout recipe for the editor (architect D-120, GEN-V9 metered).
 * Builds a best-effort FillProfile from the tenant's brand settings, calls Gemini 2.5 Flash
 * via generateSection, and returns the concrete section content (our existing shape). Never
 * throws — on any failure the recipe still composes with its fact-free defaults.
 */
export async function aiFillRecipe(
  tenantId: string,
  recipeKey: string,
): Promise<{ ok: boolean; content?: Record<string, unknown>; filled?: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const recipe = getRecipe(recipeKey);
  if (!recipe) return { ok: false, message: "Unknown recipe." };

  const profile = await profileForTenant(tenantId);

  try {
    const { content, filled } = await generateSection(recipe, profile);
    try { await recordAiUsage(tenantId, "section_generation", 1, { recipeKey, filled }); } catch { /* metering best-effort */ }
    return { ok: true, content, filled };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Generation failed." };
  }
}

/**
 * Phase-4: build a full page from an archetype (architect D-127). Returns an ordered array of
 * section contents (our shape) the editor inserts; drafts-only, the caller persists. When
 * ai:true, copy is Gemini-filled (metered per section); else fact-free recipe defaults.
 */
export async function generatePageSections(
  tenantId: string,
  archetypeKey: string,
  ai = false,
): Promise<{ ok: boolean; sections?: Record<string, unknown>[]; message?: string }> {
  await requireTenantAccess(tenantId);
  const archetype = getArchetype(archetypeKey);
  if (!archetype) return { ok: false, message: "Unknown page archetype." };
  const profile = ai ? await profileForTenant(tenantId) : {};
  try {
    const sections = await buildPage(archetype, profile, { ai });
    if (ai) { try { await recordAiUsage(tenantId, "page_generation", sections.length, { archetypeKey, sections: sections.length }); } catch { /* best-effort */ } }
    return { ok: true, sections };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Page generation failed." };
  }
}
