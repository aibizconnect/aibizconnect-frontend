Here are the rulings for Google Contacts sync round 2, addressing Ali's asks for individual contact selection and tag registry integration.

---
### 1. Individual Contact Selection

**RULING 252: Implement Individual Contact Selection for Google Sync.**

*   **Decision:** The proposal to allow tenants to select individual contacts in addition to groups is **APPROVED**.
*   **Action:**
    1.  **`tenant_integrations.config` Update:**
        *   Modify `tenant_integrations` (provider='google_contacts') config JSONB to include `selectedPeople: [{resourceName: string, name: string, email: string}]` alongside `selectedGroups`.
    2.  **`searchPeople(tenantId, query)` Server Function:**
        *   **Purpose:** Implement a new server function `searchPeople(tenantId, query)` that fetches `people.connections.list` (already has `contacts.readonly` scope) and filters by `name` or `email` substring, returning the top 20 results.
        *   **Efficiency:** Leverage the existing full `connections.list` fetch if recently performed, otherwise perform a targeted fetch.
    3.  **`runContactSync` Scope:** Modify `runContactSync` to define its scope as the **union of contacts belonging to selected groups AND individually selected people** (matched by `resourceName`). Vanished people (not found in `connections.list` during sync) should be skipped and reported.
    4.  **Google Sync Tab UI:**
        *   Add a "Specific contacts" block.
        *   Include a search box that utilizes `searchPeople` to display results.
        *   Allow users to `+Add` contacts from search results.
        *   Display selected contacts as chips with a `✕` (remove) option.
        *   Ensure "Save selection" persists both `selectedGroups` and `selectedPeople` lists.
    5.  **Files to Change:** `lib/server/calendar-connections.ts` (for `tenant_integrations` config), `app/tenants/[tenantId]/settings/contacts-actions.ts` (for `searchPeople` and sync logic), Contacts UI components.

---
### 2. Tag Registry Integration

**RULING 253: Integrate Google Contact Labels with Tenant Tag Registry.**

*   **Decision:** The proposal to integrate Google Contact labels with the tenant's tag registry (creating missing tags) is **APPROVED**.
*   **Action:**
    1.  **`applySyncedPeople` Enhancement:** Modify `applySyncedPeople` to:
        *   Collect every tag name that is about to be applied to a contact (derived from Google group display names).
        *   For each collected tag name, attempt to UPSERT it into `public.tenant_tags`.
        *   **UPSERT Logic:** Use `INSERT INTO tenant_tags ... ON CONFLICT (tenant_id, lower(name)) DO NOTHING` to ensure uniqueness and avoid conflicts.
        *   **Default Color:** Assign a neutral default color (e.g., a light gray or a system-defined default for new tags) to newly created tags.
    2.  **Impact:** This ensures new Google labels appear in Settings→Tags and are immediately available for filtering.
    3.  **Audit:** `platform_audit_log` for `crm.contacts.google_sync` will include `tagsCreated` count.
    4.  **Files to Change:** `lib/server/contacts-sync.ts` (for `applySyncedPeople`), `lib/crm.ts` (for `tenant_tags` CRUD if needed).

---
**Scope Confirmation:** Confirmed: still read-only v1, fill-empty-only for core fields, hourly throttle.

---
**Documentation Filing:** The `docs/GHL-PARITY.md` matrix will be updated to reflect these new features.

---
DECISION-LOG
[D-252] rule_implement_individual_contact_selection — Ruled implementation of individual contact selection for Google Sync (status: ruled)
[D-253] rule_integrate_google_contact_labels_tag_registry — Ruled integration of Google Contact labels with tenant tag registry (status: ruled)