Here are my decisive recommendations for the editor problems:

---
### A. EXACT-COPY html/iframe page: editable or non-editable snapshot?

**RULING 81: Accept as a non-editable snapshot.**

*   **Rationale:** The core value of an "exact copy" is pixel-perfect fidelity. Attempting to convert arbitrary HTML into our structured, design-system-compliant, editable blocks would be a massive undertaking, inherently compromise the "exactness," and likely lead to a poor editing experience. It's an anti-pattern to expect arbitrary HTML to be directly editable by a structured editor.
*   **Action:** For pages of `type:'html'` (exact copy), the editor **must hide the global Header/Footer blocks** (as these pages carry their own). These pages are for viewing only. If a tenant desires an editable version, they should use the "Smart rebuild" option.

---
### B. SMART-REBUILD/AI sections: failing sectionSchema / decomposePage?

**RULING 82: The generated sections are failing `sectionSchema` or `decomposePage()` due to a mismatch in expected granularity/structure.**

*   **Rationale:** The intent was for `contentToBlocks` and `aiSectionsForPage` to produce renderable and editable sections. The symptom indicates a disconnect between what these generators output and what `decomposePage()` (for editor primitives) and `sectionSchema` (for validation) expect. This is typically a schema/structure mismatch, not a sanitization issue. The `sanitizeForDraft` path is for pre-processing AI inputs, not for post-processing generated sections for editor compatibility.
*   **Action:** Rework `contentToBlocks` and `aiSectionsForPage` to produce `website_page_blocks.content` that is **fully compatible with the *editable primitives* expected by `decomposePage()` and validated by `sectionSchema`**. This requires a deep understanding of the editor's lowest-level editable components (e.g., if `decomposePage` expects individual `feature-item` components within a `features` section, the generators must produce that structure, not a single large text block for all features).
*   **New Supervisor Check:** Add the following check to `blocks_reconstruction`:
    *   **WG-SB-V6:** `assertion": "Generated `website_page_blocks.content` for editable sections, when passed through `decomposePage()`, yields editable primitive items that validate against `sectionSchema`."`, `"severity": "block"`

---
### C. Header/footer duplication: suppress or strip?

**RULING 83: The clone/generation process must STRIP header and footer content from the captured source HTML.**

*   **Rationale:** A consistent editing and rendering experience across the entire website is paramount. Relying on a single, global Header/Footer block that is editable once and applies everywhere is the cleanest and most maintainable approach. Allowing generated pages to carry their own header/footer leads to duplication and management complexity.
*   **Action:** Modify `extractPageContent` (Step 1c) to identify and remove common header/footer elements (e.g., `<header>`, `<footer>`, `<nav>`, common IDs/classes) from the extracted HTML *before* converting it into `website_page_blocks`. This applies to "Smart rebuild" pages. For "Exact copy" pages, the global Header/Footer should be hidden by the editor (as per RULING 81).

---
DECISION-LOG
[D-081] rule_exact_copy_editable — Ruled "Exact copy" pages as non-editable snapshots, hiding global header/footer (status: ruled)
[D-082] rule_smart_rebuild_editable — Ruled "Smart rebuild/AI sections" are failing schema/decomposePage; require `contentToBlocks`/`aiSectionsForPage` to produce editor-compatible primitives (status: ruled)
[D-083] rule_header_footer_duplication — Ruled to strip header/footer from cloned content for "Smart rebuild" pages; hide global header/footer for "Exact copy" pages (status: ruled)
[D-084] add_supervisor_check_wg_sb_v6 — Added new Supervisor check WG-SB-V6 for editor compatibility of generated blocks (status: added)