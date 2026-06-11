Here are the rulings for the Calendar Round 2 issues, addressing Ali's feedback and ensuring GHL-parity.

---
### 1. Timezone Bug

**RULING 234: Fix Timezone Bug in Slot Generation.**

*   **Decision:** The proposed fix for the timezone bug in slot generation is **APPROVED**.
*   **Action:**
    1.  **Slot Generation Logic:** Modify `availableSlots` (and any internal slot generation logic) to:
        *   Generate slots in the calendar's IANA timezone.
        *   Use `Intl.DateTimeFormat` or a robust timezone library (e.g., `date-fns-tz`, `luxon`) for accurate offset math, especially around DST boundaries.
        *   Iterate days and weekdays in the context of that specific timezone.
    2.  **Timezone Fallback:** Implement the fallback chain: `calendar.timezone` (from `tenant_calendars`) ?? `tenant_settings.default_timezone` ?? `UTC`.
    3.  **Files to Change:** `lib/calendars.ts`, `lib/server/calendar-busy.ts`, `lib/server/calendar-connections.ts` (if connection logic touches slot generation).

---
### 2. Single Account Limit

**RULING 235: Support Multiple External Calendar Accounts per Calendar.**

*   **Decision:** The proposed fix to support multiple external calendar accounts per calendar is **APPROVED**.
*   **Action:**
    1.  **DDL (Migration 0047):**
        ```sql
        -- Migration 0047_calendar_multi_account.sql

        -- Drop the existing unique constraint if it exists
        ALTER TABLE public.tenant_calendar_connections
          DROP CONSTRAINT IF EXISTS tenant_calendar_connections_tenant_id_calendar_id_provider_key;

        -- Add a new unique index that allows multiple accounts per calendar, identified by account_email
        CREATE UNIQUE INDEX IF NOT EXISTS tenant_calendar_connections_multi_account_idx
          ON public.tenant_calendar_connections (tenant_id, calendar_id, provider, coalesce(account_email, ''));

        -- Ensure account_email is NOT NULL for new connections, or handle NULLs explicitly in logic
        -- ALTER TABLE public.tenant_calendar_connections ALTER COLUMN account_email SET NOT NULL;
        -- (This might require a data backfill if existing rows have NULLs)
        ```
    2.  **Provider Functions Refactor:** Refactor provider-specific functions (e.g., `getGoogleBusy`, `createExternalEvents`) to accept and operate on the full `tenant_calendar_connection` row (or an array of rows), rather than assuming a single lookup.
    3.  **Settings UI:** Update the Calendar Settings UI to:
        *   List each connected external account (e.g., "Google: ali@example.com") with a per-account disconnect button.
        *   Provide a "Connect another account" button/flow.
    4.  **Mirror-Out (createExternalEvents):** `createExternalEvents` will now mirror to **all connected write-capable accounts** for the given calendar.
    5.  **Files to Change:** `lib/server/calendar-connections.ts`, `lib/calendars.ts` (for `createExternalEvents` calls), Calendar Settings UI components.

---
### 3. Primary-Only Busy

**RULING 236: Fetch Busy Times Across All Sub-Calendars.**

*   **Decision:** The proposed fix to fetch busy times across all sub-calendars is **APPROVED**.
*   **Action:**
    1.  **`getGoogleBusy` Enhancement:** Modify `getGoogleBusy` to:
        *   Fetch the `calendarList` (cap at 50 to avoid excessive API calls).
        *   Filter `calendarList` items to exclude those marked as `transparent` (e.g., holidays, birthdays) to avoid blocking.
        *   Query `freeBusy` across all *non-transparent* calendars returned by `calendarList`.
    2.  **Microsoft `getOutlookBusy` Enhancement:** Implement similar logic:
        *   List `/me/calendars`.
        *   For each calendar, fetch `calendarView` for busy times.
    3.  **Per-Connection Sub-Calendar Picker:** This remains a **later enhancement**.
    4.  **Files to Change:** `lib/server/calendar-connections.ts` (Google/Microsoft specific logic).

---
### 4. UX: Timezone Field

**RULING 237: Replace Free-Text Timezone with Curated Dropdown.**

*   **Decision:** The proposal to replace the free-text IANA timezone input with a curated dropdown is **APPROVED**.
*   **Action:**
    1.  **UI Component:** Implement a new UI component for timezone selection.
    2.  **Curated List:** Provide a curated list of ~35 standard IANA timezones.
    3.  **Friendly Labels:** Display friendly labels (e.g., "Eastern Time - Toronto (GMT-04:00)") with live GMT offsets.
    4.  **Prioritization:** Prioritize "America/Toronto" at the top of the list for Ali's market.
    5.  **Preserve Nonstandard:** If `tenant_calendars.timezone` contains a nonstandard value, it should be preserved and displayed as an additional option (e.g., "Custom: <nonstandard value>") at the bottom of the dropdown.
    6.  **Files to Change:** Calendar Settings UI components.

---
### 5. Embed: Public Booking Page Header

**RULING 238: Implement `?embed=1` Parameter for Public Booking Page.**

*   **Decision:** The proposal to implement a `?embed=1` search parameter to hide the AIBizConnect wordmark header and tighten padding is **APPROVED**.
*   **Action:**
    1.  **Public Booking Page (`app/book/[tenantId]/[calendarId]/page.tsx`):**
        *   Check for `?embed=1` in the URLSearchParams.
        *   Conditionally hide the AIBizConnect wordmark header.
        *   Apply tighter padding to the page layout.
    2.  **Booking Index Page (`app/book/[tenantId]/page.tsx`):** Apply the same logic.
    3.  **Future Site Calendar Element:** Ensure that when a calendar element is embedded on a tenant's site, it automatically appends `?embed=1` to the booking page URL.
    4.  **Files to Change:** Public booking page components.

---
**Missing Items (Flagged by Architect):**

*   **`external_event_id` Round-Trip:** RULING 244 already included storing `external_event_id` for mirrored manual appointments in the previous pass. This is sufficient for basic update/delete propagation. Full two-way sync is deferred.

---
DECISION-LOG
[D-234] rule_fix_timezone_bug_slot_generation — Ruled fix for timezone bug in slot generation (status: ruled)
[D-235] rule_support_multiple_external_calendar_accounts — Ruled support for multiple external calendar accounts per calendar (status: ruled)
[D-236] rule_fetch_busy_times_all_sub_calendars — Ruled fetching busy times across all sub-calendars (status: ruled)
[D-237] rule_replace_free_text_timezone_dropdown — Ruled replacing free-text timezone with a curated dropdown (status: ruled)
[D-238] rule_implement_embed_parameter_booking_page — Ruled implementation of `?embed=1` parameter for public booking page (status: ruled)