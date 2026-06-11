Here are the rulings for Calendar Conflicts, addressing Ali's report and proposing a GHL-parity solution.

---
### 1. Conflict Detection & Resolution

**RULING 241: Implement Comprehensive Conflict Detection with Warn + Override.**

*   **Decision:** The proposal to implement comprehensive conflict detection via a shared `findConflicts` function, with a **warn + override** mechanism for staff actions, is **APPROVED**.
*   **Action:**
    1.  **`findConflicts(tenantId, calendarId, startISO, endISO, excludeEntryId?)` Contract:**
        ```typescript
        // lib/calendars.ts
        export type ConflictDetail = {
          type: 'internal_appointment' | 'blocked_time' | 'external_busy';
          id?: string; // tenant_appointment.id for internal, provider_event_id for external
          title?: string; // appointment.title or 'Busy from Google'
          provider?: string; // 'google', 'outlook'
          startAt: string;
          endAt: string;
        };

        export async function findConflicts(
          tenantId: string,
          calendarId: string,
          startISO: string,
          endISO: string,
          excludeEntryId?: string // Exclude this entry itself during update/reschedule
        ): Promise<ConflictDetail[]> {
          // Logic:
          // 1. Fetch internal appointments (status booked/confirmed) and blocked times for calendarId within range.
          // 2. Fetch external busy times via getAllBusy for calendarId within range.
          // 3. Filter out the entry identified by excludeEntryId.
          // 4. Map to ConflictDetail[].
        }
        ```
    2.  **`createManualAppointment` & `updateAppointment` Integration:**
        *   These APIs will call `findConflicts`.
        *   If conflicts exist and `force: true` is *not* provided, they will return `{ok: false, conflictDetails: ConflictDetail[]}`.
        *   If conflicts exist and `force: true` *is* provided, they will proceed with the operation.
    3.  **UI Flow (Warn + Override):** The UI will:
        *   Call `createManualAppointment` or `updateAppointment`.
        *   If conflicts are returned, display a modal: "Conflicts with X. Book anyway?"
        *   If user confirms, retry the API call with `force: true`.
    4.  **Blocked Time Creation:** `createBlockedTime` will **remain uncheck-gated**. Blocking over existing events is an intentional override.

---
### 2. Calendar Grid Display of External Busy

**RULING 242: Display External Busy as Synthetic Read-Only Entries in Grid.**

*   **Decision:** The approach of displaying external busy times as synthetic read-only entries in the staff calendar grid is **APPROVED**.
*   **Action:**
    1.  **`listAppointmentsRange` Enhancement:** This API will be enhanced to:
        *   Fetch all internal appointments and blocked times.
        *   Call `getAllBusy` for the specified calendars.
        *   Merge `getAllBusy` results as *synthetic* `tenant_appointment` objects in the returned array.
            *   These synthetic entries will have `kind: 'external_busy'`, `source: 'sync'`, `title: 'Busy - <provider>'`, and `id: 'synthetic-<provider>-<event_id>'` (not a real DB ID).
    2.  **UI Rendering:** The calendar grid will render these synthetic entries as gray striped chips labeled "Busy — <provider>".
    3.  **Interaction:** These synthetic chips will be **not clickable** and **not editable** (no details popover, no delete/reschedule actions).

---
### 3. Mirror Manual Appointments to External Calendars

**RULING 243: Mirror Manual Appointments to External Calendars (Best-Effort).**

*   **Decision:** Mirroring manual appointments to Google/Outlook via `createExternalEvents` is **APPROVED**.
*   **Action:**
    1.  **`createManualAppointment` Integration:** After successfully creating the internal `tenant_appointment`, `createManualAppointment` will call `createExternalEvents` (best-effort, fire-and-forget) to mirror the event to connected external calendars.
    2.  **`updateAppointment` Integration:** If `startAt`, `endAt`, `title`, or `calendarId` changes for an internal appointment, `updateAppointment` will call `updateExternalEvent` (best-effort) to reflect the change.
    3.  **`deleteAppointment` Integration:** If an internal appointment is deleted, `deleteExternalEvent` (best-effort) will be called.

---
### 4. `external_event_id` Round-Trip

**RULING 244: Include `external_event_id` Round-Trip in This Pass (Minimal).**

*   **Decision:** Storing `external_event_id` for manual appointments mirrored out to external calendars **is included in this pass** to enable basic update/delete propagation.
*   **Action:**
    1.  **`tenant_appointments.external_event_id`:** When `createExternalEvents` is called for a manual appointment and succeeds, the returned `external_event_id` will be stored in the `tenant_appointments.external_event_id` column.
    2.  **Two-Way Sync/Cancel Propagation:** Full two-way sync (e.g., external changes updating internal appointments, external cancellations updating internal status) is **deferred** as a follow-up. This pass only enables basic outbound mirroring updates/deletes.

---
DECISION-LOG
[D-241] rule_implement_comprehensive_conflict_detection — Ruled implementation of comprehensive conflict detection with warn + override (status: ruled)
[D-242] rule_display_external_busy_synthetic_entries — Ruled display of external busy as synthetic read-only entries in calendar grid (status: ruled)
[D-243] rule_mirror_manual_appointments_external_calendars — Ruled mirroring manual appointments to external calendars (best-effort) (status: ruled)
[D-244] rule_include_external_event_id_round_trip — Ruled inclusion of `external_event_id` round-trip in this pass (minimal) (status: ruled)