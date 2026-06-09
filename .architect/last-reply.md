Here are the decisive rulings for the autonomous capture-to-rebuild pipeline, addressing the fidelity bug.

---
### 1. Canonical Autonomous Capture Pipeline

**RULING 141: Mandate Rendered-DOM-with-Computed-Styles for ALL Captures.**

Every capture (client's own site, or any URL) **must go through a rendered-DOM-with-computed-styles step (data-cs) by default**. The render bridge is now **mandatory** for all captures, not opt-in or SPA-only.

*   **Rationale:** The core problem is loss of fidelity and structure. Relying on static HTML fetch without computed styles inherently loses critical layout, spacing, and typography information, leading to "flat output." For SPA sites, it's a complete failure. To achieve "visually faithful AND editable" (D-091), the system *must* have access to the fully rendered DOM with computed styles. This elevates `htmlToSections` to its full potential.
*   **Action:** Modify `fetchPage` to *always* use the render bridge. The `looksLikeSpaShell` check becomes irrelevant for determining *if* to render, only for *how* to interpret the initial fetch.

---
### 2. Production Renderer for `SITE_RENDER_URL`

**RULING 142: Hosted Browserless/ScrapingBee-style Endpoint for Production Renderer.**

For production, use a **Browserless/ScrapingBee-style hosted endpoint** via `SITE_RENDER_URL`.

*   **Rationale:**
    *   **Reliability & Scalability:** These services are purpose-built for headless browser automation, offering high reliability, scalability, and managed infrastructure.
    *   **Cost Management:** They provide clear pricing models, allowing for predictable cost management.
    *   **Decoupling:** Decouples the rendering infrastructure from our Vercel deployment, avoiding potential cold start issues or resource contention with our core application logic.
    *   **MCP vs. Dedicated:** While MCP has Chrome, it's not designed for high-volume, programmatic HTML rendering for external sites. It's for internal AI tasks.
*   **Action:** Configure `SITE_RENDER_URL` to point to a chosen hosted headless browser service. Implement robust error handling and retry logic for calls to this endpoint.

---
### 3. Elimination of Lossy Fallback

**RULING 143: Eliminate Lossy `extractPageContent` Fallback for Rebuilds; Retain for Net-New Analysis.**

The lossy `extractPageContent` → `contentToBlocks` fallback **must be eliminated** for the "rebuild my existing site" path.

*   **Rationale:** Silently degrading fidelity and structure undermines the core value proposition. If a faithful DOM cannot be obtained, the user must be informed.
*   **Action for Rebuild Path:** If the render bridge (RULING 141) fails to return a usable DOM (e.g., timeout, service error), the system **must inform the user** that it cannot capture the site faithfully and offer options (e.g., retry, manual content input, proceed with a basic template). It must *not* fall back to `extractPageContent` for rebuilding.
*   **Retention for Net-New Analysis:** `extractPageContent` can be retained for the "analyze for a NET-NEW build" path where only high-level semantic extraction (business name, services, tone) is needed, and visual fidelity is not the goal.

---
### 4. Fidelity Contract for Capture Failures

**RULING 144: Mark Page Low-Fidelity and Offer Re-capture on Render Bridge Failure.**

When the capture process (via the mandatory render bridge) fails to yield a usable DOM with `data-cs` (RULING 141), the system **must mark the page as low-fidelity** and offer a re-capture.

*   **Action:**
    1.  If `fetchPage` (now always using the render bridge) fails to return a valid DOM or `htmlToSections` yields an empty/unusable structure:
        *   Set `website_pages.status` to `capture_failed` or `low_fidelity`.
        *   Store an error message in `website_pages.capture_error_details` (new JSONB column).
        *   Present a clear message to the user in the editor/wizard: "We couldn't faithfully capture your site. Please try again or provide content manually."
        *   Offer a "Re-capture" button that re-initiates the `fetchPage` process.
    2.  Do *not* proceed with a partial or lossy build for the "rebuild" path.

---
### 5. Decision Logic for Capture vs. Generation

**RULING 145: Decision Logic for Capture vs. Generation Paths.**

The decision logic will be as follows:

*   **Scenario (a) Client provides their own site URL (for "Rebuild My Site"):**
    1.  **Mandatory Render Bridge Capture:** Attempt `fetchPage` via the render bridge (RULING 141).
    2.  **`htmlToSections`:** Process the rendered DOM with `htmlToSections` (using "faithful" mode).
    3.  **Image Ingestion:** Run `ingestPageImages` (D-133).
    4.  **Success:** Proceed with `website_page_tree` generation, linking captured sections.
    5.  **Failure:** Mark page low-fidelity, offer re-capture (RULING 144). *Do not fall back to lossy methods.*

*   **Scenario (b) Client provides a completed profile/no site (for "Build a Net-New Site"):**
    1.  **`website_analysis_results`:** Use existing `website_analysis_results` (from Step 1a/1b) for business profile, industry, tone, growth intent.
    2.  **Page Archetype Generation:** Use `buildPage` (D-127) with `ai:true` to generate pages based on archetypes and `LayoutRecipe`s (D-120), filling slots with fact-free content.
    3.  **AI Image Creation:** Trigger AI image creation (D-134) for suitable slots.

*   **Scenario (c) Client provides a competitor/not-their site (for "Analyze a Competitor"):**
    1.  **Mandatory Render Bridge Capture:** Attempt `fetchPage` via the render bridge (RULING 141).
    2.  **`htmlToSections`:** Process the rendered DOM with `htmlToSections` (using "faithful" mode).
    3.  **No Image Ingestion/AI Images:** Do *not* ingest images or generate AI images for competitor sites.
    4.  **`website_analysis_results`:** Use `extractPageContent` (semantic-only, RULING 143) to populate `website_analysis_results` for competitive analysis purposes.
    5.  **No Page Generation:** Do not generate pages for competitor sites. This is for analysis only.

---
DECISION-LOG
[D-141] rule_canonical_capture_pipeline — Ruled mandatory rendered-DOM-with-computed-styles for all captures (status: ruled)
[D-142] rule_prod_renderer — Ruled hosted Browserless/ScrapingBee-style endpoint for production renderer (status: ruled)
[D-143] rule_eliminate_lossy_fallback — Ruled elimination of lossy `extractPageContent` fallback for rebuilds, retained for net-new analysis (status: ruled)
[D-144] rule_fidelity_contract_capture_failures — Ruled to mark page low-fidelity and offer re-capture on render bridge failure (status: ruled)
[D-145] rule_decision_logic_capture_generation — Ruled decision logic for capture vs. generation paths (status: ruled)