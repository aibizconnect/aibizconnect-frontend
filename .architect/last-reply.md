### CONTROL RULING: REVISE "Stitch Not Recommended" to "Stitch as a Template Authoring Tool"

The new findings significantly change the assessment of Google Stitch, particularly its ability to generate design systems that align perfectly with our token model. However, the programmatic HTML retrieval blocker is critical.

---
### 1. Revised Position on Stitch for Design Generation

**RULING 137: Stitch is a Powerful Design System & Template Authoring Tool, Not a Runtime Page Generator (for now).**

*   **Revision:** My previous "Stitch not recommended" stance is **REVISED**. Stitch is exceptionally well-suited for **design system generation** and **high-quality template authoring**.
*   **Fit vs. Deterministic Recipe Pipeline:**
    *   **Stitch's Role:** Stitch excels at generating the *initial aesthetic* (our `BrandTokens`) and *visually coherent section HTML* (which `htmlToSections` can then decompose). It's a powerful source of *inspiration and high-fidelity examples* for our `LayoutRecipe` library.
    *   **Our Pipeline's Role:** Our deterministic recipe pipeline (Phase 3/4) remains the **runtime generation engine**. It ensures anti-hallucination, cost control, and predictable output by filling *pre-defined structural slots* with content.
*   **Fit vs. Claude-API Path:** Stitch's strength is visual design. Claude (or Gemini) is stronger for *content generation and logical structuring*. A Claude-API path would be for filling content into our recipes, not for generating the visual design itself.

---
### 2. Architecture Ruling: Stitch's Role

**RULING 138: Stitch is a TEAM Tool to Author Premium Templates and Seed the Recipe Library (Option A & C).**

*   **Primary Role (A & C):** Stitch should be used as an **internal TEAM tool** to:
    1.  **Author Premium Templates:** Generate high-fidelity HTML sections and pages. These can then be imported via `htmlToSections`, refined, and saved as new `LayoutRecipe`s (RULING 119) or `PageArchetype`s (RULING 127). This provides a continuous source of high-quality, on-brand templates.
    2.  **Seed the Recipe Library:** Use Stitch's design system output (the `DESIGN.md` and derived tokens) to enrich and expand our `BrandTokens` defaults and `LayoutRecipe` styling.
*   **Runtime Per-Tenant Generator (B):** **NOT APPROVED for runtime per-tenant generation** at this time. The "headless-MCP screen-fetch issue" is a critical blocker. Until Google provides a reliable, programmatic API for retrieving generated HTML from Stitch's MCP, it cannot be part of the automated, headless build pipeline.

---
### 3. `htmlToSections` as the Long-Term Bridge

**RULING 139: `htmlToSections` is the Canonical Bridge for External HTML Design Sources.**

`lib/sites/html-importer.ts htmlToSections(html)` is the **correct and canonical long-term bridge** for *any* external HTML design source (Stitch, Figma exports, site-capture, etc.).

*   **Rationale:** It's proven to segment raw HTML into our editable section model, capturing typography and basic structure. This is the fundamental conversion step from arbitrary HTML to our structured, editable format.
*   **Contract:** The contract for any external design source is: **produce HTML that `htmlToSections` can parse into our `BlockContent[]` structure.**

---
### 4. Hardening `htmlToSections` Grid Detection

**RULING 140: Harden `htmlToSections` Grid/Column Detection.**

Yes, hardening `htmlToSections` grid/column detection is **mandatory**. The current behavior (3-pillar grid → 1-col row of heading+text pairs) indicates a critical gap in structural recognition.

*   **Action:** Enhance `htmlToSections` to:
    1.  **Detect CSS Grid/Flexbox:** Analyze `display: grid` and `display: flex` properties (and their children's `flex-basis`, `grid-column-start`/`end`) from computed styles (D-091) more robustly.
    2.  **Map to `row` with `columns`:** Accurately map these to our `row` block type, correctly populating `row.columns` with appropriate `width` (e.g., inferring from `grid-template-columns` or `flex-basis`) and nesting child blocks within those columns.
    3.  **Prioritize Semantic Structure:** Where possible, infer semantic grouping (e.g., a group of `image`+`heading`+`text` as a "feature card") and encapsulate it within a column.

---
DECISION-LOG
[D-137] revise_stitch_position — Revised "Stitch not recommended" to "Stitch as a Template Authoring Tool" (status: revised)
[D-138] rule_stitch_role — Ruled Stitch as an internal TEAM tool for template authoring and seeding the recipe library (status: ruled)
[D-139] rule_html_to_sections_bridge — Ruled `htmlToSections` as the canonical bridge for external HTML design sources (status: ruled)
[D-140] rule_harden_html_to_sections_grid_detection — Ruled to harden `htmlToSections` grid/column detection (status: ruled)