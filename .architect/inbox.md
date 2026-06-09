ARCHITECT — STOP, course-correct before code. The Builder audited the repo and found we ALREADY have most of a token system. Your Ruling 107 (add a new `theme_tokens` JSONB) would create a 4th overlapping system. Reconcile.

GROUND TRUTH (what already exists):
1. `website_brand_settings` already has JSONB columns from migration 0031:
   - `color_palette` default {"primary":"#1e3a8a","secondary":"#0ea5e9","accent":"#22d3ee","background":"#ffffff","surface":"#f8fafc","border":"#e2e8f0","foreground":"#0f172a","muted":"#64748b"}
   - `font_pairing` default {"heading":"Roboto","body":"Roboto"}
   - `spacing_scale` {"base":16,"unit":"px"}, `button_style` {"borderRadius":"10px","padding":"12px 22px"}
   - plus a `theme` JSONB (migration 0013) and legacy scalar cols primary_color/secondary_color/accent_color/font_heading/font_body.
2. `lib/design/tokens.ts` already has a zod `BrandTokens` schema (version "1.0"; colors: primary/accent/surface/background/foreground/muted/border + optional success/warning/danger; typography fontHeading/fontBody/fontMono/fontDisplayBrand/scale/baseSizePx; spacing unitPx/radiusPx/maxWidthPx; breakpoints; elevation; density) AND `tokensToCssVars(t)` that emits `--abc-color-*`, `--abc-font-heading/body/display-brand`, `--abc-base-size`, `--abc-space-unit`, `--abc-radius`, `--abc-maxw`.
3. `lib/design/element-style.ts` DEFAULT_ELEMENT_STYLE already references `var(--abc-color-border)`; styleToCss resolves bg tokens (surface/primary/accent) too.
4. `lib/design/brand-memory.ts` reads `tenant_brand_memory` table and uses tokensToCssVars to apply `--abc-*` in the design-preview route.
5. THE ACTUAL GAP: the PUBLIC site renderer `app/sites/[tenantId]/[slug]/page.tsx` only injects legacy `--primary/--secondary/--accent/--font-heading/--font-body` — it does NOT emit the `--abc-*` vars. So the canonical token vars element-style depends on are MISSING at public render. Editor/canvas likely same.

REVISED ASK — give me the reconciled Phase-1 that uses what exists, NOT a new column:
1. Which existing store is canonical: `color_palette`+`font_pairing` (0031) vs `BrandTokens` in tokens.ts vs `tenant_brand_memory`? Pick ONE source of truth and rule how the others bridge to it. No new SQL column unless truly required.
2. The exact `--abc-*` CSS variable contract we standardize on (you saw the existing emitters). Confirm/extend the naming so element-style + sections all read the same vars.
3. The single `resolveBrandTokens(tenantId, websiteId)` function contract that merges legacy scalars + color_palette/font_pairing + theme JSONB into one BrandTokens object, and the single `tokensToCssVars` injection point both the public renderer AND the editor canvas must use.
4. Minimal `style_token` vocabulary mapped to the EXISTING `--abc-*` vars (reuse, don't invent a parallel set).
Phase 1 only. Decisive, numbered, reconciled with the above reality.
