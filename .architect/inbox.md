# Consult: HIGH-FIDELITY editable import (exact padding/spacing/layout) + global CSS + fonts→typography

## Where we are
Importer builds an editable layer tree (page → sections → row/columns → elements) from a rendered DOM (we have a Playwright render bridge, so we get the painted HTML + can read getComputedStyle). Header/Footer → shared global blocks (now with hierarchical menu+submenus), Hero detected, body via htmlToSections, SEO → draft_seo, fonts/colors → website_brand_settings.theme.

## Ali's new requirement
Make the import **visually faithful AND editable**: every section/row/column/element recognized and placed **in the same position with the same padding, spacing, colors, font-sizes, alignment, widths** as the original — and show all of them in the **Layers** tree. Plus:
- pull the site's **CSS** and put it in the website's **global/custom CSS**,
- **fonts** into the Typography panel (not just theme),
- **SEO** into its fields (done).

## Schema facts
- `rowSchema` has `_style: record<string,any>`, `colStyles: record<string,any>[]`, `widths`, `gap`, `valign`, `contentWidth`, `minHeight`.
- Most element schemas have presentational fields (align, fontFamily, fontSize, color, etc.); need to confirm whether a generic `_style` is honored by the renderer for ALL element types, or only some.
- There is a per-page Custom CSS panel and a site Typography panel (saveTypography) + site custom CSS (need to confirm a SITE-wide global CSS store exists).

## Design question — pick the approach for "same padding/spacing/layout":
**(A) Computed-style capture** in the render bridge: walk the rendered DOM and, per kept element, record a curated set of computed styles (padding, margin, gap, display, flex-direction, justify/align, width/max-width, font-size/weight/line-height/letter-spacing, color, background, border-radius, text-align). Importer maps these into `_style`/`colStyles`/element style fields. Self-contained (no selector/ancestor dependence), stays editable. Cost: bigger bridge payload + a renderer that applies `_style` to every element type.

**(B) Global-CSS + preserved classNames:** inline the source CSS as global CSS and keep each imported element's original class list; rely on the cascade. Editable-ish but fragile — our renderer wraps elements in different ancestry, so descendant/utility selectors (esp. Tailwind compiled classes like aibizconnect.app uses) won't match reliably.

**(C) Hybrid:** computed-style capture for layout/spacing/typography (the reliable part) + capture CSS variables / @font-face / keyframes into global CSS for fonts and effects. Probably the answer — confirm.

## Specific asks
1. Approve **(A)/(B)/(C)** and the exact computed-style property whitelist to capture (keep it minimal but sufficient for fidelity).
2. Where to store the captured **global CSS** (site-wide custom CSS table/column?) and how much to keep (cap size; strip framework resets?). For Tailwind-compiled CSS (huge), do we keep it or rely on computed styles instead?
3. **Renderer**: should we extend the section renderer so EVERY element type honors a generic `_style` object (so captured styles apply uniformly), or map into each element's typed style fields? Migration risk?
4. **Fonts → Typography**: write extracted fonts into the Typography store (saveTypography) AND register @font-face/Google-Fonts links so they actually load. Confirm the store + how custom fonts are loaded site-wide.
5. **Layers tree**: it already lists sections/rows/columns/elements. Any structural requirement so captured nested rows/columns show correctly and selecting one maps to the right node?
6. Performance + idempotency gotchas; size caps; don't overwrite tenant edits on re-import.

Please give a decisive recommendation + a minimal computed-style whitelist + storage plan + any renderer change needed, and new Supervisor checks (FID-V*).
