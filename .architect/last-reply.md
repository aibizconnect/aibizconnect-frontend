Here are the rulings for the Google Contacts import sync, addressing Ali's directive for CRM contact synchronization.

---
### 1. Google Contacts Import Sync (v1, Read-Only)

**RULING 245: Implement Google Contacts Read-Only Import Sync (v1).**

*   **Decision:** The proposal for Google Contacts read-only import sync (v1) is **APPROVED**.
*   **Action:**
    1.  **OAuth Integration:**
        *   **Scope:** Reuse existing Google platform OAuth client. Add `https://www.googleapis.com/auth/contacts.readonly` scope.
        *   **Connection:** Tenant-level connection.
        *   **Secrets:** Tokens encrypted via `setIntegrationSecret(tenantId, 'google_contacts')`.
        *   **Config:** Non-secret state in `tenant_integrations` (provider='google_contacts') config JSONB: `{accountEmail, selectedGroups:[{resourceName,name}], lastSyncAt, lastReport}`.
        *   **Callback:** `/api/contacts/google/callback` mirroring the calendar callback pattern.
        *   **Error Handling:** Implement clear error surfacing if People API is not enabled in Google Cloud console.
    2.  **Group Selection UI:**
        *   **Location:** New "Google Sync" tab in `ContactsShell`.
        *   **Connect Button:** Admin-gated (`isPlatformAdmin()`).
        *   **Group List:** Display `contactGroups.list` (user groups only, with member counts) as checkboxes.
        *   **Actions:** "Save selection," "Sync now" button, "Last sync report" (matched/created/updated + tags applied).
    3.  **Sync Core (`applySyncedPeople(tenantId, people: GooglePerson[])`):**
        *   **API Call:** Use `people.connections.list` (with `personFields` for names, emailAddresses, phoneNumbers, organizations, memberships; paginate 1000).
        *   **Filtering:** Keep contacts belonging to *any* of the `selectedGroups`.
        *   **Upsert Logic:**
            *   **Match:** Prioritize matching by `custom.googleResourceName` (no DDL needed, lives in existing `custom` JSONB) first, then by `email` (case-insensitive).
            *   **Fill-Empty-Only:** For `name`, `phone`, `company`, `owner_email`, `dnd`, `avatar_url`, `full_name`, `company` in `tenant_contacts`, update *only if the field is currently empty* (our edits win).
            *   **Source:** Set `source='google contacts'` on create.
            *   **Tags:** Union of existing `tags` + ALL the contact's user-group display names (from `memberships`, excluding system groups like `myContacts`, `starred`). Existing tags are preserved, new tags are added.
            *   **Skip:** Contacts with no email are skipped and counted in the report.
        *   **No Deletes/Outbound Writes:** Strictly read-only import. No deletes, no outbound writes to Google.
    4.  **Auto-Sync:**
        *   **Endpoint:** `/api/cron/contact-sync` (protected by `CRON_SECRET`).
        *   **Scheduler:** Added to the existing `aibizconnect-cron` Cloudflare Worker (fires every 15 minutes).
        *   **Throttling:** Route self-throttles to one sync/hour per tenant via `lastSyncAt` in `tenant_integrations.config`.
    5.  **Audit:** `platform_audit_log` entries for `crm.contacts.google_sync` (counts, no PII).
    6.  **Testing:** Unit-test `applySyncedPeople` core against fabricated People payloads. OAuth path verified once Ali connects.
*   **Scope Confirmation:** Confirmed: read-only v1, fill-empty-only for core fields, tags-union (no removal), `custom.googleResourceName` for matching, cron piggyback.

---
**Documentation Filing:** The `docs/GHL-PARITY.md` matrix will be updated to reflect this new feature.

---
DECISION-LOG
[D-245] rule_implement_google_contacts_read_only_sync — Ruled implementation of Google Contacts read-only import sync (v1) (status: ruled)