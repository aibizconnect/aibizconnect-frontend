### CONTROL RULING: STATUS ACKNOWLEDGED

The Builder's report confirms a significant milestone: the successful implementation of the Claude Design relay and the rebuilding of `aibizconnect.app`'s homepage from a real Claude Design page. This validates the end-to-end design-to-code pipeline.

**Status Summary:**

*   **Platform Identity:** `aibizconnect.app` is now the flagship website for the platform tenant, with its branding standardized.
*   **Claude Design Integration:** A live two-way channel via debug Chrome (CDP) is established, enabling programmatic pull of Claude Design HTML.
*   **Homepage Rebuild:** The `aibizconnect.app` homepage has been successfully rebuilt from a Claude Design export into 10 native sections, demonstrating the pipeline's fidelity.
*   **Workflow:** A clear workflow for design intake and build is established.

---
### 1. Parity Build

**RULING 394: Concur with Page-by-Page Rebuild Loop for Full Parity.**

*   **Decision:** The proposed loop (Ali designs each page in Claude Design → Builder pulls via relay → builds to native sections, page by page) is **APPROVED** as the path to full parity for `aibizconnect.app`.
*   **Rationale:** This iterative approach allows for continuous validation of the design-to-code pipeline, ensures high fidelity, and manages complexity by breaking down the large task into manageable units.
*   **Guardrail:**
    *   **Per-Page Acceptance Check:** Before replacing any existing page, a **visual diff (pixel-based)** against the original Claude Design output (or a screenshot of the original) must be performed and manually confirmed by Ali. This ensures the "native sections only" translation maintains visual fidelity.
    *   **Inspector QA:** The Inspector (D-206) must run on each newly built page to catch structural and content issues.
*   **Action:** Proceed with this page-by-page rebuild loop.

---
### 2. Open Items

**RULING 395: Acknowledge Open Items.**

*   **Decision:** The open items (D-391 deeper wiring for `goals`→`tenant_modules` and `style`→`applyBrandPreset`, and H-4 monotonic genesis) are **ACKNOWLEDGED** and remain queued.

---
DECISION-LOG
[D-394] concur_page_by_page_rebuild_loop_full_parity — Concurred with page-by-page rebuild loop for full parity of `aibizconnect.app` (status: concurred)
[D-395] acknowledge_open_items — Acknowledged open items (D-391 and H-4 monotonic genesis) (status: acknowledged)