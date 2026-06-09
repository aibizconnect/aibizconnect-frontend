Here is the concrete, ranked, phased plan for "religious HTML import," maximizing visual fidelity while preserving editability and asset durability.

---
### Phase 0: Foundational Rulings (Pre-requisites)

**RULING 146: Mandate Render Bridge for All HTML Imports.**
*   **Rationale:** This is the only way to reliably obtain computed styles (`data-cs`) for *any* HTML source (live site, pasted markup with classes, Figma export). Attempting to parse and resolve CSS in-process (Option A) is extremely complex, error-prone, and will never match browser rendering perfectly. A tiny Tailwind mapper (Option B) is too limited. The render bridge is the single source of truth for visual fidelity.
*   **Action:** All `htmlToSections` calls (including `importHtmlAsDraftPage` and `cloneSectionsFromHtml`) must ensure their `html` input comes from a render bridge pass that injects `data-cs`. If `SITE_RENDER_URL` is unset (local dev) or the render bridge fails, the import **must fail gracefully** and inform the user of low fidelity (RULING 144).

**RULING 147: Implement Production Render Bridge.**
*   **Rationale:** RULING 146 is blocked without a production-ready `SITE_RENDER_URL`.
*   **Action:** Prioritize implementation of the hosted Browserless/ScrapingBee-style endpoint for `SITE_RENDER_URL` (RULING 142).

---
### Phase 1: Asset Durability & Core Fidelity (Immediate Impact)

**RULING 148: Ingest All Imported Images into Media Library.**
*   **Rationale:** Fragile hotlinks are a critical durability and reusability issue. Ingesting images makes them tenant-owned, durable, and available in the editor's media picker.
*   **Action:**
    1.  **Modify `htmlToSections`:** Enhance `htmlToSections` to collect all `src` attributes from `<img>` tags and `url()` values from `background-image` CSS properties (from `data-cs` or inline styles) during its DOM walk.
    2.  **Post-Decomposition Pass:** After `htmlToSections` returns the `BlockContent[]`, run `lib/sites/image-ingestion.ts ingestPageImages(tenantId, websiteId, pageId, sections)` (D-133) to process this array. This function will use `lib/media/ingest.ts ingestExternalImage` (D-132) to fetch, deduplicate, store, and rewrite URLs.
    3.  **Files to Change:** `lib/sites/html-importer.ts`, `lib/sites/image-ingestion.ts`, `stitch-actions.ts`, `wizard-actions.ts`.
*   **Sequencing:** This must happen *before* saving the draft page, so the saved `BlockContent` contains durable URLs.

---
### Phase 2: Enhanced Section Segmentation & Fidelity Mapping

**RULING 149: Implement Visual Grouping for Section Segmentation.**
*   **Rationale:** Relying solely on top-level `main` children for band detection is too simplistic. Visual cues (background changes, significant vertical spacing) are stronger indicators of distinct sections/bands.
*   **Action:**
    1.  **Enhance Render Bridge:** The render bridge should not just inject `data-cs`, but also analyze visual grouping. It can identify contiguous blocks of elements sharing a common background color/image, or separated by significant vertical margins/padding.
    2.  **`htmlToSections` Band Detection:** Modify `htmlToSections` to use this visual grouping information (e.g., injected as `data-band-id` or `data-band-props`) to create top-level `row` blocks that represent these visual bands.
    3.  **Heuristic:** Prioritize background changes and large vertical spacing (e.g., `margin-top` > 48px or `padding-top` > 48px) as primary band delimiters.
*   **Files to Change:** `scripts/render-server.mjs`, `lib/sites/html-importer.ts`.

**RULING 150: Refined Style Fidelity Mapping.**
*   **Rationale:** We need a clear line for which CSS properties are promoted to our block system vs. dropped, balancing fidelity with editability.
*   **Action:**
    1.  **Promote to `_style`/`layout_style`:** The computed-style whitelist (D-091) is the core. These properties (padding, margin, flexbox/grid, width/height, font-size/family/weight, color, background, border, shadow, etc.) *must* be mapped to `_style` (ElementStyle) or `layout_style` (RULING 114) on the most granular editable element.
    2.  **Promote to `custom_css`:** Complex CSS (e.g., `@keyframes`, very specific pseudo-selectors, complex `filter` properties) that cannot be mapped to `_style` should be captured into `public.websites.custom_css` (D-092) for site-wide application.
    3.  **Drop:** Highly specific, non-reusable, or conflicting CSS (e.g., `!important` overrides from source, `transition` properties that might conflict with our animations, obscure vendor prefixes) should be dropped.
    4.  **Files to Change:** `lib/sites/style-capture.ts`, `lib/sites/html-importer.ts`.

---
### Phase 3: Two-Way Fidelity Check & Low-Fidelity Flagging

**RULING 151: Implement Two-Way Fidelity Check with Visual Diff.**
*   **Rationale:** To guarantee "religious import" and reliably flag low-fidelity pages (D-144), we need an automated way to compare the rebuilt output against the source.
*   **Action:**
    1.  **Render Rebuilt Page:** After `saveDraft` (with ingested images and mapped styles), use the same render bridge (RULING 142) to render our *rebuilt draft page* back to HTML.
    2.  **Visual Diff:** Perform a visual diff (pixel-based comparison) between the screenshot of the *original source page* and the screenshot of our *rebuilt draft page*.
    3.  **Score & Flag:** Store a fidelity score (e.g., 0-100) in `website_pages.fidelity_score` (new column) and `website_pages.status='low_fidelity'` (D-144) if the score falls below a threshold (e.g., <85).
    4.  **Cheapest Reliable Approach:** Use a service like Percy.io or Chromatic for visual regression testing, or implement a custom Playwright-based pixel diff. Given cost, a custom Playwright-based pixel diff (e.g., `pixelmatch` library) is the cheapest reliable approach.
*   **Files to Change:** `lib/sites/site-clone.ts`, `lib/sites/html-importer.ts`, `wizard-actions.ts`, `stitch-actions.ts`, `website_pages` table (new `fidelity_score` column).

---
**Supervisor Verification Checks (New/Updated):**

**RULING 152: Supervisor Verification Schema for Religious HTML Import**

```json
{
  "religious_html_import": [
    { "id": "REL-V1", "assertion": "All `htmlToSections` calls (including `importHtmlAsDraftPage` and `cloneSectionsFromHtml`) receive HTML input from a render bridge pass that injects `data-cs` attributes.", "severity": "block" },
    { "id": "REL-V2", "assertion": "If the render bridge fails or `SITE_RENDER_URL` is unset, the import process fails gracefully and informs the user of low fidelity, rather than proceeding with unstyled primitives.", "severity": "block" },
    { "id": "REL-V3", "assertion": "The system correctly collects all unique image URLs (from `<img>` and `background-image` CSS) from the source HTML during import.", "severity": "block" },
    { "id": "REL-V4", "assertion": "All collected image URLs are successfully ingested into the tenant Media Library via `ingestExternalImage` and `ingestPageImages` before saving the draft page.", "severity": "block" },
    { "id": "REL-V5", "assertion": "Image URLs in the saved `BlockContent` are rewritten to point to the tenant's Media Library URLs.", "severity": "block" },
    { "id": "REL-V6", "assertion": "The render bridge is enhanced to analyze visual grouping (background changes, significant vertical spacing) and inject this information into the DOM.", "severity": "block" },
    { "id": "REL-V7", "assertion": "The `htmlToSections` function is enhanced to use visual grouping information to create top-level `row` blocks representing distinct visual bands.", "severity": "block" },
    { "id": "REL-V8", "assertion": "The `htmlToSections` function correctly maps CSS Grid/Flexbox layouts to our `row` with `columns` structure, inferring `width` and nesting blocks.", "severity": "block" },
    { "id": "REL-V9", "assertion": "The `style-capture.ts` and `html-importer.ts` correctly promote properties from the computed-style whitelist (D-091) to `_style`/`layout_style` on the most granular editable elements.", "severity": "block" },
    { "id": "REL-V10", "assertion": "Complex CSS (e.g., `@font-face`, CSS variables, `@keyframes`) is captured into `public.websites.custom_css` (D-092).", "severity": "block" },
    { "id": "REL-V11", "assertion": "Obscure or conflicting CSS (e.g., `!important` overrides, transition properties) is dropped during style mapping.", "severity": "block" },
    { "id": "REL-V12", "assertion": "A two-way fidelity check is implemented: the rebuilt draft page is rendered, screenshotted, and visually diffed against the original source page.", "severity": "block" },
    { "id": "REL-V13", "assertion": "A `fidelity_score` (numeric) column is added to `website_pages` table.", "severity": "block" },
    { "id": "REL-V14", "assertion": "If the fidelity score falls below a threshold (e.g., <85), `website_pages.status` is set to `low_fidelity` and `website_pages.capture_error_details` (new JSONB column) is populated.", "severity": "block" },
    { "id": "REL-V15", "assertion": "The editor/wizard UI clearly indicates pages with `low_fidelity` status and offers a 'Re-capture' option.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-146] rule_mandate_render_bridge — Ruled to mandate render bridge for all HTML imports (status: ruled)
[D-147] rule_implement_prod_render_bridge — Ruled to prioritize implementation of production render bridge (status: ruled)
[D-148] rule_ingest_all_imported_images — Ruled to ingest all imported images into Media Library (status: ruled)
[D-149] rule_enhanced_section_segmentation — Ruled to implement visual grouping for section segmentation (status: ruled)
[D-150] rule_refined_style_fidelity_mapping — Ruled refined style fidelity mapping (promote/drop CSS properties) (status: ruled)
[D-151] rule_two_way_fidelity_check — Ruled to implement two-way fidelity check with visual diff (status: ruled)
[D-152] define_religious_html_import_checks — Defined Supervisor verification checks for religious HTML import (status: defined)