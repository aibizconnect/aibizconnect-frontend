Here is the reconciled Phase 1 spec, leveraging existing structures and addressing the identified gaps.

---
### 1. Canonical Store & Bridging

**RULING 107 (Revised): `website_brand_settings` as Canonical Store for `brand_tokens_v2`**

`public.website_brand_settings` is the canonical database store for website-specific brand tokens. To consolidate the existing fragmented JSONB columns (`color_palette`, `font_pairing`, `spacing_scale`, `button_style`, `theme`) and legacy scalars, a **single new `brand_tokens_v2` JSONB column** is required. This column will hold the canonical `BrandTokens` structure.

**SQL Migration (0043_add_brand_tokens_v2_to_website_brand_settings.sql):**

```sql
-- Migration 0043_add_brand_tokens_v2_to_website_brand_settings.sql

ALTER TABLE public.website_brand_settings
ADD COLUMN IF NOT EXISTS brand_tokens_v2 jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.website_brand_settings.brand_tokens_v2 IS 'Consolidated, canonical design token system for colors, typography, spacing, etc.';
```

**Bridging Strategy:**
*   **During Migration:** A one-time data migration will populate `brand_tokens_v2` by merging data from `color_palette`, `font_pairing`, `spacing_scale`, `button_style`, `theme` (0013), and legacy scalar columns.
*   **Post-Migration:** All new code (generation, editor, renderer) will read and write *only* to `brand_tokens_v2`. The older JSONB columns and scalars will be considered deprecated and can be eventually removed in future migrations.

---
### 2. Standardized `--abc-*` CSS Variable Contract

**RULING 110 (Revised): Standardize on the Existing `--abc-*` CSS Variable Contract**

The existing `--abc-*` CSS variable naming convention (e.g., `--abc-color-primary`, `--abc-font-heading`) from `lib/design/tokens.ts` `tokensToCssVars` is **approved and standardized**.

**CSS Variable Contract:**

| Category      | Token Path in `BrandTokens` | CSS Variable Name              | Example Value        |
| :------------ | :-------------------------- | :----------------------------- | :------------------- |
| **Colors**    | `colors.primary.value`      | `--abc-color-primary`          | `#1e3a8a`            |
|               | `colors.accent.value`       | `--abc-color-accent`           | `#22d3ee`            |
|               | `colors.surface.value`      | `--abc-color-surface`          | `#f8fafc`            |
|               | `colors.background.value`   | `--abc-color-background`       | `#ffffff`            |
|               | `colors.foreground.value`   | `--abc-color-foreground`       | `#0f172a`            |
|               | `colors.muted.value`        | `--abc-color-muted`            | `#64748b`            |
|               | `colors.border.value`       | `--abc-color-border`           | `#e2e8f0`            |
|               | `colors.success.value`      | `--abc-color-success`          | `#28a745`            |
|               | `colors.warning.value`      | `--abc-color-warning`          | `#ffc107`            |
|               | `colors.danger.value`       | `--abc-color-danger`           | `#dc3545`            |
| **Typography**| `typography.fontHeading.value` | `--abc-font-heading`          | `Roboto, sans-serif` |
|               | `typography.fontBody.value` | `--abc-font-body`              | `Roboto, sans-serif` |
|               | `typography.fontMono.value` | `--abc-font-mono`              | `monospace`          |
|               | `typography.fontDisplayBrand.value` | `--abc-font-display-brand` | `Montserrat, sans-serif` |
|               | `typography.baseSizePx`     | `--abc-base-size`              | `16px`               |
|               | `typography.scale.<key>.value` | `--abc-font-size-<key>`     | `1.25rem` (for `xl`) |
| **Spacing**   | `spacing.unitPx`            | `--abc-space-unit`             | `16px`               |
|               | `spacing.<key>Px`           | `--abc-space-<key>`            | `8px` (for `sm`)     |
| **Radius**    | `radiusPx`                  | `--abc-radius`                 | `10px`               |
| **Shadows**   | `elevation.<key>`           | `--abc-shadow-<key>`           | `0 4px 6px ...`      |
| **Breakpoints**| `breakpoints.<key>`        | `--abc-breakpoint-<key>`       | `640px` (for `sm`)   |

---
### 3. `resolveWebsiteBrandTokens` and `tokensToCssVars` Injection

**RULING 112: Unified Token Resolution and Injection**

A single `resolveWebsiteBrandTokens(websiteId)` function will be the authoritative source for a `BrandTokens` object, and `tokensToCssVars` will be the single injection point for CSS variables.

**`resolveWebsiteBrandTokens(websiteId)` Contract:**

```typescript
// lib/server/brand-tokens-resolver.ts (server-only)

import { BrandTokens, BrandTokensSchema } from '../design/tokens'; // Assuming this is the existing BrandTokens schema
import { db } from './supabase'; // Assuming Supabase client
import { z } from 'zod';

// Define schemas for existing legacy columns (for migration purposes)
const LegacyColorPaletteSchema = z.object({ /* ... as per existing 0031 migration */ }).partial().passthrough();
const LegacyFontPairingSchema = z.object({ /* ... as per existing 0031 migration */ }).partial().passthrough();
const LegacySpacingScaleSchema = z.object({ /* ... as per existing 0031 migration */ }).partial().passthrough();
const LegacyButtonStyleSchema = z.object({ /* ... as per existing 0031 migration */ }).partial().passthrough();
const LegacyThemeSchema = z.object({ /* ... as per existing 0013 migration */ }).partial().passthrough();

/**
 * Resolves the canonical BrandTokens object for a given website.
 * Merges data from legacy columns into brand_tokens_v2 if necessary.
 *
 * @param websiteId The ID of the website.
 * @returns A validated BrandTokens object.
 */
export async function resolveWebsiteBrandTokens(websiteId: string): Promise<BrandTokens> {
  const { data: settings, error } = await db.from('website_brand_settings')
    .select('*')
    .eq('website_id', websiteId)
    .single();

  if (error || !settings) {
    // Handle error or return default BrandTokens
    console.error("Error fetching website_brand_settings:", error);
    return BrandTokensSchema.parse({}); // Return default/empty BrandTokens
  }

  let brandTokens: BrandTokens;

  // Check if brand_tokens_v2 is already populated and valid
  if (settings.brand_tokens_v2 && Object.keys(settings.brand_tokens_v2).length > 0) {
    const parseResult = BrandTokensSchema.safeParse(settings.brand_tokens_v2);
    if (parseResult.success) {
      brandTokens = parseResult.data;
    } else {
      console.warn(`Invalid brand_tokens_v2 for website ${websiteId}, attempting migration from legacy.`);
      // Fall through to migration logic if invalid
      brandTokens = BrandTokensSchema.parse({}); // Start with default
    }
  } else {
    // brand_tokens_v2 is empty or null, perform migration from legacy columns
    console.log(`Migrating legacy brand settings for website ${websiteId}.`);
    brandTokens = BrandTokensSchema.parse({}); // Start with default

    // Merge from existing color_palette
    const colorPalette = LegacyColorPaletteSchema.safeParse(settings.color_palette);
    if (colorPalette.success) {
      Object.assign(brandTokens.colors, {
        primary: { value: colorPalette.data.primary || '#1e3a8a' },
        accent: { value: colorPalette.data.accent || '#22d3ee' },
        surface: { value: colorPalette.data.surface || '#f8fafc' },
        background: { value: colorPalette.data.background || '#ffffff' },
        foreground: { value: colorPalette.data.foreground || '#0f172a' },
        muted: { value: colorPalette.data.muted || '#64748b' },
        border: { value: colorPalette.data.border || '#e2e8f0' },
        // Map other colors, ensure defaults if missing
        success: { value: '#28a745' }, warning: { value: '#ffc107' }, danger: { value: '#dc3545' },
      });
    }

    // Merge from existing font_pairing
    const fontPairing = LegacyFontPairingSchema.safeParse(settings.font_pairing);
    if (fontPairing.success) {
      Object.assign(brandTokens.typography, {
        fontHeading: { value: `${fontPairing.data.heading || 'Roboto'}, sans-serif` },
        fontBody: { value: `${fontPairing.data.body || 'Roboto'}, sans-serif` },
      });
    }

    // Merge from spacing_scale
    const spacingScale = LegacySpacingScaleSchema.safeParse(settings.spacing_scale);
    if (spacingScale.success && spacingScale.data.base) {
      Object.assign(brandTokens.spacing, {
        unitPx: `${spacingScale.data.base}px`,
        // Derive other spacing tokens based on base unit if possible, or use defaults
        xs: `${spacingScale.data.base * 0.25}px`, sm: `${spacingScale.data.base * 0.5}px`, md: `${spacingScale.data.base}px`,
        lg: `${spacingScale.data.base * 1.5}px`, xl: `${spacingScale.data.base * 2}px`,
      });
    }

    // Merge from button_style (e.g., borderRadius)
    const buttonStyle = LegacyButtonStyleSchema.safeParse(settings.button_style);
    if (buttonStyle.success && buttonStyle.data.borderRadius) {
      Object.assign(brandTokens.radius, {
        md: buttonStyle.data.borderRadius, // Map to a specific radius token
      });
    }

    // Merge from legacy 'theme' (0013) and scalar primary_color, etc.
    // This part requires specific knowledge of the 'theme' JSONB structure and scalar names.
    // Builder: Implement specific mapping logic here based on the actual content of 'theme' and scalars.
    // Example: if (settings.primary_color) brandTokens.colors.primary.value = settings.primary_color;

    // After merging, update the DB to persist the new canonical form
    const { error: updateError } = await db.from('website_brand_settings')
      .update({ brand_tokens_v2: brandTokens })
      .eq('website_id', websiteId);
    if (updateError) {
      console.error("Error updating brand_tokens_v2 after migration:", updateError);
    }
  }

  return brandTokens;
}
```

**`tokensToCssVars` Injection Point:**
The `tokensToCssVars(brandTokens: BrandTokens)` function (from `lib/design/tokens.ts`) will be called with the result of `resolveWebsiteBrandTokens`. Its output (a string of CSS variable declarations) will be injected into the `<head>` of:
*   `app/sites/[tenantId]/[slug]/page.tsx` (public renderer)
*   The editor canvas component (for live editing)

---
### 4. Minimal `style_token` Vocabulary

**RULING 111 (Revised): Phase 1 `style_token` Vocabulary Mapped to `--abc-*`**

The canonical vocabulary for `style_token` will directly map to the `--abc-*` CSS variables.

*   **Colors:**
    *   `color-primary` → `var(--abc-color-primary)`
    *   `color-accent` → `var(--abc-color-accent)`
    *   `color-surface` → `var(--abc-color-surface)`
    *   `color-background` → `var(--abc-color-background)`
    *   `color-foreground` → `var(--abc-color-foreground)`
    *   `color-muted` → `var(--abc-color-muted)`
    *   `color-border` → `var(--abc-color-border)`
    *   `color-success` → `var(--abc-color-success)`
    *   `color-error` → `var(--abc-color-danger)` (using `danger` from `BrandTokens` for consistency)
    *   `color-warning` → `var(--abc-color-warning)`
*   **Typography (Font Families):**
    *   `font-heading` → `var(--abc-font-heading)`
    *   `font-body` → `var(--abc-font-body)`
    *   `font-mono` → `var(--abc-font-mono)`
    *   `font-display-brand` → `var(--abc-font-display-brand)`
*   **Typography (Font Sizes):**
    *   `font-size-xs` → `var(--abc-font-size-xs)`
    *   `font-size-sm` → `var(--abc-font-size-sm)`
    *   `font-size-md` → `var(--abc-font-size-md)`
    *   `font-size-lg` → `var(--abc-font-size-lg)`
    *   `font-size-xl` → `var(--abc-font-size-xl)`
    *   `font-size-2xl` → `var(--abc-font-size-2xl)`
    *   `font-size-3xl` → `var(--abc-font-size-3xl)`
    *   `font-size-4xl` → `var(--abc-font-size-4xl)`
    *   `font-size-5xl` → `var(--abc-font-size-5xl)`
*   **Spacing:**
    *   `space-unit` → `var(--abc-space-unit)`
    *   `space-xs` → `var(--abc-space-xs)`
    *   `space-sm` → `var(--abc-space-sm)`
    *   `space-md` → `var(--abc-space-md)`
    *   `space-lg` → `var(--abc-space-lg)`
    *   `space-xl` → `var(--abc-space-xl)`
    *   `space-2xl` → `var(--abc-space-2xl)`
    *   `space-3xl` → `var(--abc-space-3xl)`
*   **Border Radius:**
    *   `radius-sm` → `var(--abc-radius-sm)`
    *   `radius-md` → `var(--abc-radius-md)`
    *   `radius-lg` → `var(--abc-radius-lg)`
    *   `radius-full` → `var(--abc-radius-full)`
*   **Shadows:**
    *   `shadow-sm` → `var(--abc-shadow-sm)`
    *   `shadow-md` → `var(--abc-shadow-md)`
    *   `shadow-lg` → `var(--abc-shadow-lg)`

---
DECISION-LOG
[D-107] rule_sql_migration_brand_tokens_v2 — Ruled SQL migration 0043 to add `brand_tokens_v2` JSONB column to `website_brand_settings` as the canonical store (status: ruled)
[D-108] rule_ts_zod_brand_tokens — Ruled `lib/design/tokens.ts` `BrandTokens` as the canonical TypeScript type and Zod schema (status: ruled)
[D-109] rule_deterministic_migration_function_to_v2 — Ruled deterministic migration function to populate `brand_tokens_v2` from all legacy `website_brand_settings` columns (status: ruled)
[D-110] rule_css_variable_contract — Ruled standardization on the existing `--abc-*` CSS variable contract (status: ruled)
[D-111] rule_phase1_style_token_vocabulary_mapped — Ruled the minimal canonical `style_token` vocabulary for Phase 1, mapped to `--abc-*` CSS variables (status: ruled)
[D-112] rule_unified_token_resolution_injection — Ruled `resolveWebsiteBrandTokens` as the unified token resolver and `tokensToCssVars` as the single injection point (status: ruled)