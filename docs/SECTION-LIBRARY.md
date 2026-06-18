# Tokenized, re-skinnable Section Library

Integrated into the platform (Path A — no fork). Ratified D-386..390. The same native sections render
premium real estate or any other vertical by swapping a token **preset**; nothing in the components is a
hardcoded color/font.

## How re-skin works (one pipeline)
```
preset JSON (BrandTokens) → website_brand_settings → resolveBrandTokens()/resolveTheme()
  → tokensToCssVars() (--abc-* CSS vars) + ThemeTokens → every renderer (SectionView, public site, editor)
```
A preset feeds BOTH consumers: the `--abc-*` CSS variables AND the `ThemeTokens` that `SectionView` reads
(colors incl. background/text, fonts, radius). So a swap re-skins fully — no "half-skinned" sections.

## Token presets
Presets are JSON files = a serialized `BrandTokens` (`lib/design/tokens.ts`):
`colors` (primary, primaryContrast, accent, surface, background, foreground, muted, border…),
`typography` (fontHeading, fontBody, scale, baseSizePx), `spacing` (unitPx, radiusPx, maxWidthPx),
`breakpoints`, `elevation`, `density`.

- `lib/design/token-presets/realestate.json` — premium (navy/gold, Playfair, spacious, 6px radius)
- `lib/design/token-presets/neutral.json` — clean baseline (slate/blue, Inter, 12px radius)

### Add a vertical
Drop a new `lib/design/token-presets/<key>.json` (same shape). It auto-appears in `listPresets()`.

### Swap (re-skin a tenant)
```ts
import { applyBrandPreset } from "@/lib/design/token-presets";
await applyBrandPreset(tenantId, "realestate"); // writes the brand fields the renderers read → re-skins
```
Precedence (H-2): a tenant's own brand edits > the applied preset > system defaults.

## The sections
Token-driven, re-skinnable variants live in `lib/sections/prebuilt-templates.ts` (system templates = code,
D-390). They appear in the editor's **Add panel**, are swappable via P2 (`getSectionAlternatives` /
`replaceSectionWithPrebuilt`), and AI-regenerable (`rewriteSectionAI`). Groups (2 variants each): Nav, Hero,
Header, Form, Calendar/Booking, Survey, About-Me, About-Us, Footer, CTA, Pricing, FAQ, Testimonials.

**Authoring rule:** zero hardcoded hex/font. Text/buttons inherit the theme; for a section background that
must re-skin, use a semantic token reference, e.g. `_style: { background: "var(--abc-color-primary)" }` and
`color: "var(--abc-color-primaryContrast)"` — never a literal hex.

## Consuming a section
- **In React (the platform):** sections are `SectionContent` objects rendered by `SectionView`
  (`components/sections/registry.tsx`) with the resolved `theme` + the `--abc-*` vars in scope. This is
  what the editor + public site use, and what the `/preview` page renders.
- **As static HTML (drop into any site):** the section content + the active preset's `tokensToCssVars()`
  fully describe the markup. Because Next.js forbids `react-dom/server` inside the app bundle, a true
  string export runs OUTSIDE the app bundle (a small render service / standalone Node script that mounts
  `SectionView` with `renderToStaticMarkup`). Deferred as a follow-up; the in-app `/preview` proves the
  render + re-skin today.

## Preview
`/platform/section-library` (platform-team gated) renders every re-skinnable variant for both presets with a
**Real Estate ↔ Neutral** switcher, so the re-skin is visible at a glance.

## Phasing (done)
- **P-A** — token contract + presets + `applyBrandPreset` (+ full re-skin fix).
- **P-B** — the 2-variant native section set (token-driven).
- **P-C** — `renderSectionToHtml` export + `/preview` switcher + this README.
