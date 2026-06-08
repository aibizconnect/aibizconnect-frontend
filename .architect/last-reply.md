Here is the decisive recommendation for high-fidelity editable import.

---
### 1. Approach and Computed-Style Whitelist

**RULING 91: Hybrid Approach (C) with Specific Computed-Style Whitelist**

The **Hybrid approach (C)** is approved:
*   **Computed-style capture** for layout, spacing, typography, colors, backgrounds, and borders. This ensures visual fidelity for the most critical presentational aspects directly on the elements.
*   **Global CSS capture** for `@font-face` rules, CSS variables, and keyframes. This handles custom fonts and complex effects that aren't easily translated to individual element styles.

**Computed-Style Property Whitelist (Minimal & Sufficient):**
This whitelist should be captured for every relevant DOM element during the render bridge walk.

*   **Layout & Box Model:**
    *   `display` (e.g., block, flex, grid, inline-block)
    *   `position` (e.g., relative, absolute, static)
    *   `top`, `right`, `bottom`, `left` (if `position` is not static)
    *   `width`, `min-width`, `max-width`
    *   `height`, `min-height`, `max-height`
    *   `padding-top`, `padding-right`, `padding-bottom`, `padding-left`
    *   `margin-top`, `margin-right`, `margin-bottom`, `margin-left`
    *   `gap` (for flex/grid containers)
    *   `flex-direction`, `justify-content`, `align-items`, `flex-wrap` (for flex containers)
    *   `grid-template-columns`, `grid-template-rows`, `grid-auto-flow` (for grid containers)
    *   `text-align`
    *   `vertical-align`
    *   `overflow`
*   **Typography:**
    *   `font-family`
    *   `font-size`
    *   `font-weight`
    *   `line-height`
    *   `letter-spacing`
    *   `text-transform`
    *   `text-decoration`
*   **Colors & Backgrounds:**
    *   `color`
    *   `background-color`
    *   `background-image` (e.g., gradients, URLs)
    *   `background-position`, `background-size`, `background-repeat`
*   **Borders & Shadows:**
    *   `border-top-width`, `border-right-width`, `border-bottom-width`, `border-left-width`
    *   `border-top-style`, `border-right-style`, `border-bottom-style`, `border-left-style`
    *   `border-top-color`, `border-right-color`, `border-bottom-color`, `border-left-color`
    *   `border-top-left-radius`, `border-top-right-radius`, `border-bottom-left-radius`, `border-bottom-right-radius`
    *   `box-shadow`
*   **Other:**
    *   `opacity`
    *   `z-index`
    *   `cursor`

---
### 2. Global CSS Storage

**RULING 92: Global CSS Storage**

A new column `custom_css` (TEXT) should be added to `public.websites` to store site-wide custom CSS.

*   **Storage:** `public.websites.custom_css` (TEXT).
*   **Content:** Capture `@font-face` rules, CSS variables, and keyframes from the source site's computed styles.
*   **Size Cap:** Implement a size cap (e.g., 256KB) for `custom_css`. If the captured CSS exceeds this, prioritize `@font-face` and CSS variables, then truncate.
*   **Stripping:** Strip framework resets (e.g., normalize.css, Tailwind base styles) and highly specific utility classes that won't apply in our renderer's DOM structure. Focus on structural and branding CSS.
*   **Tailwind-compiled CSS:** For sites using Tailwind, rely primarily on the **computed-style capture** (RULING 91) rather than attempting to capture and reapply the vast, utility-driven CSS. Only extract `@font-face` and CSS variables from Tailwind sites.

---
### 3. Renderer Extension

**RULING 93: Renderer Extension for `_style`**

The section renderer **must be extended so that EVERY element type honors a generic `_style: record<string, any>` object**.

*   **Rationale:** This is the most flexible and maintainable approach. It avoids a complex migration of adding specific style fields to every element schema and ensures that captured styles apply uniformly.
*   **Implementation:**
    *   Update all element schemas to include a `_style: record<string, any>` field.
    *   The renderer should apply these `_style` properties directly as inline styles (or via a CSS-in-JS solution) to the rendered DOM element.
*   **Migration Risk:** This is a schema change, but adding a new field (even to many tables/schemas) is generally safe. The primary risk is ensuring the renderer correctly applies these styles without conflicts with existing typed style fields. `_style` should take precedence for any overlapping properties.

---
### 4. Fonts → Typography Panel

**RULING 94: Fonts Integration into Typography**

*   **Typography Store:** Extracted `font-family` values should be written to `website_brand_settings.font_pairing` (e.g., `heading`, `body`) and potentially a new `website_brand_settings.custom_fonts` array for additional detected fonts.
*   **Font Loading:**
    *   **Google Fonts:** If `font-family` matches a Google Font, automatically generate and inject the `<link>` tag for that font into the site's `<head>` (managed by the platform).
    *   **Custom `@font-face`:** The captured `@font-face` rules (from `public.websites.custom_css`) will ensure custom fonts load.
    *   **Font Fallbacks:** Ensure the generated CSS always includes generic font fallbacks (e.g., `sans-serif`, `serif`).

---
### 5. Layers Tree

**RULING 95: Layers Tree Structure**

The importer's `htmlToSections` (or equivalent) must correctly identify and represent nested rows and columns.

*   **Structural Requirements:** The importer must detect `display: flex` or `display: grid` containers and their direct children to correctly map to `rowSchema` and `colStyles`. This means the `_style` object for a `row` should contain `gap`, `flex-direction`, etc., and the `colStyles` array for its children should contain `width`, `padding`, etc.
*   **Selection Mapping:** Ensure that selecting a visual element in the editor's canvas correctly highlights its corresponding node in the Layers tree, and vice-versa. This requires a robust mapping between the rendered DOM and our internal section/element IDs.

---
### 6. Gotchas & Performance

**RULING 96: Gotchas & Performance**

*   **Performance:** The render bridge payload will be larger due to computed styles. Optimize the Playwright script to only capture styles for visible, relevant elements, and minimize the number of style properties (as per whitelist).
*   **Idempotency:** On re-import, the system should:
    *   **Preserve Tenant Edits:** If a tenant has manually edited a section's `_style` or a global CSS rule, the re-import should *not* overwrite these edits. This requires tracking user edits (e.g., a `user_edited: boolean` flag on sections/elements, or only applying styles if the field is `null` or matches a known system-generated default).
    *   **Merge Global CSS:** Merge new `@font-face`/CSS variables into existing `custom_css`, avoiding duplicates.
*   **Size Caps:** Implement size caps for `custom_css` (RULING 92) and potentially for the `_style` JSONB fields on elements.
*   **Complexity:** This is a significant undertaking. Prioritize the most impactful style properties first.

---
### 7. Supervisor Verification Checks

**RULING 97: Supervisor Verification Schema for High-Fidelity Import**

```json
{
  "high_fidelity_import": [
    { "id": "FID-V1", "assertion": "The render bridge captures the specified whitelist of computed CSS properties for relevant DOM elements.", "severity": "block" },
    { "id": "FID-V2", "assertion": "The `public.websites` table has a `custom_css` (TEXT) column to store site-wide custom CSS.", "severity": "block" },
    { "id": "FID-V3", "assertion": "The importer extracts `@font-face` rules, CSS variables, and keyframes into `public.websites.custom_css`.", "severity": "block" },
    { "id": "FID-V4", "assertion": "The `public.websites.custom_css` field respects a size cap (e.g., 256KB) and prioritizes `@font-face`/CSS variables.", "severity": "block" },
    { "id": "FID-V5", "assertion": "All element schemas (sections, rows, columns, elements) are extended to include a generic `_style: record<string, any>` field.", "severity": "block" },
    { "id": "FID-V6", "assertion": "The renderer correctly applies properties from the `_style` object as inline styles to the corresponding DOM elements, taking precedence over conflicting typed style fields.", "severity": "block" },
    { "id": "FID-V7", "assertion": "Extracted `font-family` values are written to `website_brand_settings.font_pairing` and/or a `custom_fonts` array.", "severity": "block" },
    { "id": "FID-V8", "assertion": "Google Fonts are automatically loaded via `<link>` tags, and custom `@font-face` rules from `custom_css` are applied.", "severity": "block" },
    { "id": "FID-V9", "assertion": "The importer correctly detects and maps nested `display: flex`/`grid` containers and their children to `rowSchema` and `colStyles`.", "severity": "block" },
    { "id": "FID-V10", "assertion": "The Layers tree accurately reflects the imported section/row/column/element structure, and selection in the editor maps correctly to the tree nodes.", "severity": "block" },
    { "id": "FID-V11", "assertion": "On re-import, the system preserves tenant's manual edits to `_style` fields or `custom_css` (e.g., by only applying if `null` or system-generated).", "severity": "block" },
    { "id": "FID-V12", "assertion": "Captured styles (padding, spacing, colors, font-sizes, alignment, widths) are visually faithful to the original site in the editor.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-091] rule_high_fidelity_approach — Ruled Hybrid approach (C) for high-fidelity import with specific computed-style whitelist (status: ruled)
[D-092] rule_global_css_storage — Ruled `public.websites.custom_css` for global CSS storage with size caps and stripping rules (status: ruled)
[D-093] rule_renderer_extension — Ruled to extend renderer for generic `_style` object on all elements (status: ruled)
[D-094] rule_fonts_typography_integration — Ruled on integrating extracted fonts into Typography panel and font loading (status: ruled)
[D-095] rule_layers_tree_structure — Ruled on structural requirements for Layers tree (status: ruled)
[D-096] rule_fidelity_gotchas — Ruled on performance, idempotency, size caps, and not overwriting tenant edits (status: ruled)
[D-097] define_fidelity_verification_checks — Defined Supervisor verification checks for high-fidelity import (status: defined)