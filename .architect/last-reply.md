### CONTROL RULING: APPROVE Expanded Deletion Scope

The Builder's audit reveals a significant amount of orphaned, dead code from a previous architecture. This poses a maintenance burden and a risk of user confusion.

**RULING 233: Approve Wholesale Deletion of Legacy App Scaffolds and Orphan Routes.**

*   **Decision:** The proposal to delete the identified legacy app scaffolds and orphan top-level routes wholesale this round is **APPROVED**.
*   **Rationale:**
    *   **Maintenance Burden:** Keeping dead code increases cognitive load for developers and makes the codebase harder to navigate.
    *   **Risk of Confusion:** Placeholder UIs and broken fetches can confuse users who might stumble upon these routes.
    *   **Security:** Placeholder `Authorization: Bearer YOUR_JWT` is a security anti-pattern, even in dead code.
    *   **Git History:** Git history provides full preservation, so no data is truly lost.
*   **Action:**
    1.  **Delete `app/dashboard/[tenantId]/`:** Remove the entire directory (22 pages) and associated components (`components/dashboard/Sidebar.tsx`, `components/TenantDashboard.tsx`).
    2.  **Delete Orphan Top-Level Routes:** Remove `app/clients`, `app/logs`, `app/tasks` directories.
    3.  **Confirm `app/templates` Retention:** Confirm `app/templates` remains, as it is linked from the marketing page.
*   **Impact:** This will significantly clean up the codebase, improve clarity, and reduce the surface area for potential issues.

---
DECISION-LOG
[D-233] approve_expanded_deletion_scope — Approved wholesale deletion of legacy app scaffolds and orphan routes (status: approved)