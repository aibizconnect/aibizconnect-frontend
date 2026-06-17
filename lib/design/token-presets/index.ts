import { brandTokensSchema, type BrandTokens } from "@/lib/design/tokens";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import realestate from "./realestate.json";
import neutral from "./neutral.json";

/**
 * Token presets (Builder North-Star P-A, D-386/387/388/389/390 ratified). A preset is a serialized
 * BrandTokens file. Applying one re-skins a tenant end-to-end through the EXISTING pipeline:
 *   preset JSON → BrandTokens → website_brand_settings → resolveBrandTokens → tokensToCssVars → --abc-*
 * No Tailwind fork, no parallel theme system. Add a vertical = drop a new JSON here.
 */

const RAW: Record<string, unknown> = { realestate, neutral };

export interface TokenPreset { key: string; name: string; tokens: BrandTokens }

export function listPresets(): TokenPreset[] {
  return Object.entries(RAW).map(([key, raw]) => ({
    key,
    name: (raw as any)?.name || key,
    tokens: brandTokensSchema.parse(raw),
  }));
}

export function presetTokens(key: string): BrandTokens | null {
  const raw = RAW[key];
  if (!raw) return null;
  const parsed = brandTokensSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Apply a preset to a tenant — writes the fields resolveBrandTokens reads, so the live site + editor
 * re-skin immediately. H-2 precedence is preserved: this writes the tenant's own brand row (tenant
 * settings win over preset defaults win over system defaults). Idempotent. Never touches `theme`
 * (site settings/occasions live there). Returns the applied tokens.
 */
export async function applyBrandPreset(tenantId: string, presetKey: string): Promise<{ ok: boolean; tokens?: BrandTokens; error?: string }> {
  const t = presetTokens(presetKey);
  if (!t) return { ok: false, error: `Unknown preset "${presetKey}"` };
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("website_brand_settings").upsert({
    tenant_id: tenantId,
    primary_color: t.colors.primary,
    accent_color: t.colors.accent,
    font_heading: t.typography.fontHeading,
    font_body: t.typography.fontBody,
    color_palette: {
      primary: t.colors.primary, accent: t.colors.accent, surface: t.colors.surface,
      background: t.colors.background, foreground: t.colors.foreground, muted: t.colors.muted, border: t.colors.border,
    },
    font_pairing: { heading: t.typography.fontHeading, body: t.typography.fontBody },
    button_style: { borderRadius: `${t.spacing.radiusPx}px` },
  }, { onConflict: "tenant_id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, tokens: t };
}
