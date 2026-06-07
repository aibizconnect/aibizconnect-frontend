import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { brandTokensSchema, DEFAULT_BRAND_TOKENS, type BrandTokens } from "./tokens";
import { z } from "zod";

/**
 * Shared per-tenant brand/design memory (M-3, ratified). One source of brand truth
 * every Agent Mesh role (brand, content, UX, SEO, nav, social, email) reads before
 * acting — this is what makes cross-role output cohesive instead of each agent
 * re-deriving brand context per run.
 *
 * Backed by public.tenant_brand_memory (DDL queued). Degrades GRACEFULLY: if the
 * table is absent or empty, returns the house defaults so the mesh keeps working
 * before the DDL is applied (DDL-queue protocol — nothing assumed live).
 *
 * Strictly tenant-scoped (M-2): a tenant only ever reads/writes its own row.
 */

export const brandVoiceSchema = z.object({
  tone: z.array(z.string()).default([]),          // e.g. ["confident","warm","expert"]
  audience: z.string().optional(),
  taglines: z.array(z.string()).default([]),
  doNotUse: z.array(z.string()).default([]),
});
export type BrandVoice = z.infer<typeof brandVoiceSchema>;

export const informationArchitectureSchema = z.object({
  pages: z.array(z.object({ slug: z.string(), title: z.string(), intent: z.string().optional() })).default([]),
  primaryNav: z.array(z.string()).default([]),     // ordered page slugs
});
export type InformationArchitecture = z.infer<typeof informationArchitectureSchema>;

export const brandMemorySchema = z.object({
  tenantId: z.string().uuid(),
  tokens: brandTokensSchema,
  voice: brandVoiceSchema,
  ia: informationArchitectureSchema,
  updatedAt: z.string().optional(),
});
export type BrandMemory = z.infer<typeof brandMemorySchema>;

function service(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function defaults(tenantId: string): BrandMemory {
  return { tenantId, tokens: DEFAULT_BRAND_TOKENS, voice: { tone: [], taglines: [], doNotUse: [] }, ia: { pages: [], primaryNav: [] } };
}

/** Read a tenant's brand memory; falls back to house defaults if absent/unavailable. */
export async function getBrandMemory(tenantId: string): Promise<{ memory: BrandMemory; source: "db" | "default" }> {
  try {
    const { data, error } = await service()
      .from("tenant_brand_memory")
      .select("tenant_id, tokens, voice, ia, updated_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !data) return { memory: defaults(tenantId), source: "default" };
    const parsed = brandMemorySchema.safeParse({
      tenantId: data.tenant_id,
      tokens: data.tokens ?? DEFAULT_BRAND_TOKENS,
      voice: data.voice ?? {},
      ia: data.ia ?? {},
      updatedAt: data.updated_at,
    });
    return parsed.success ? { memory: parsed.data, source: "db" } : { memory: defaults(tenantId), source: "default" };
  } catch {
    return { memory: defaults(tenantId), source: "default" };
  }
}

/** Upsert a tenant's brand memory. Service-role gated; caller must have verified ownership. */
export async function setBrandMemory(input: Partial<BrandMemory> & { tenantId: string }): Promise<{ ok: boolean; error?: string }> {
  const current = (await getBrandMemory(input.tenantId)).memory;
  const merged = brandMemorySchema.safeParse({
    tenantId: input.tenantId,
    tokens: input.tokens ?? current.tokens,
    voice: input.voice ?? current.voice,
    ia: input.ia ?? current.ia,
  });
  if (!merged.success) return { ok: false, error: merged.error.issues.map((i) => i.message).join("; ") };
  try {
    const { error } = await service()
      .from("tenant_brand_memory")
      .upsert({ tenant_id: input.tenantId, tokens: merged.data.tokens, voice: merged.data.voice, ia: merged.data.ia, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Per-tenant design-system toggle (Ali's direction): each tenant owns whether their
 * public site renders via the new token-driven design system. Reads
 * tenant_brand_memory.design_system_enabled. Degrades to FALSE on any error / missing
 * column, so it is safe BEFORE the DDL is applied (live site stays on the legacy look
 * until the tenant explicitly flips it).
 */
export async function getDesignSystemEnabled(tenantId: string): Promise<boolean> {
  try {
    const { data, error } = await service()
      .from("tenant_brand_memory")
      .select("design_system_enabled")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !data) return false;
    return data.design_system_enabled === true;
  } catch {
    return false;
  }
}

/** Tenant flips their own site to the new design system (service-role; caller verified). */
export async function setDesignSystemEnabled(tenantId: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service()
      .from("tenant_brand_memory")
      .upsert({ tenant_id: tenantId, design_system_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Compact brand context string for injection into role system prompts. */
export function brandContextForPrompt(m: BrandMemory): string {
  const tone = m.voice.tone.length ? m.voice.tone.join(", ") : "professional";
  return [
    `Brand colors: primary ${m.tokens.colors.primary}, accent ${m.tokens.colors.accent}.`,
    `Heading font: ${m.tokens.typography.fontHeading}; body: ${m.tokens.typography.fontBody}.`,
    `Voice/tone: ${tone}.`,
    m.voice.doNotUse.length ? `Avoid: ${m.voice.doNotUse.join(", ")}.` : "",
  ].filter(Boolean).join(" ");
}
