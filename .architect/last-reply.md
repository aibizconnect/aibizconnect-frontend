Here are the rulings for finalizing calendars/bookings for AI-Agent (VA) operation.

---
### 1. Calendar Visibility (Phase A)

**RULING 248: Implement Calendar Visibility Phase A.**

*   **Decision:** The implementation of Phase A of D-260 (default visibility, host badge, 'My calendars' toggle) is **APPROVED**.
*   **Action:**
    1.  **Host Badge:** Display the `assigned_to_name` (or `assigned_to_email`) on calendars in the filter and settings list.
    2.  **'My Calendars' Toggle:** Implement a one-click toggle in the calendar view filter. This toggle will default ON when the server passes the current signed-in user's email, and it matches any calendar's `assigned_to_email`.
    3.  **Files to Change:** Calendar UI components, `listCalendars` API (to pass user email for filtering).

---
### 2. Agent Calendar Tool Layer

**RULING 249: Implement Agent Calendar Tool Layer.**

*   **Decision:** The proposal for a typed, validated, and audited Agent Calendar Tool layer is **APPROVED**.
*   **Action:**
    1.  **Module:** Create `lib/agent/tools/calendar-tools.ts`.
    2.  **Tool Surface:** Implement the following functions, wrapping existing battle-tested core calendar logic and inheriting all its features (conflict checks, timezone-correct slots, provider mirroring, native invites, reminders engine):
        *   `listCalendars(tenantId): Promise<{ok: boolean, data?: CalendarSummary[], error?: string}>`
        *   `getAvailability(tenantId, calendarIdOrSlug, days): Promise<{ok: boolean, data?: AvailableSlot[], error?: string}>`
        *   `findAppointments(tenantId, {email?, phone?}): Promise<{ok: boolean, data?: AppointmentSummary[], error?: string}>`
        *   `bookAppointment(tenantId, {calendarId, startAt, name, email, phone?, venueIdx?, invitees?, force?: boolean}): Promise<{ok: boolean, data?: AppointmentConfirmation, error?: string, conflictDetails?: ConflictDetail[]}>`
        *   `rescheduleAppointment(tenantId, {appointmentId, newStartAt, force?: boolean}): Promise<{ok: boolean, data?: AppointmentConfirmation, error?: string, conflictDetails?: ConflictDetail[]}>`
        *   `cancelAppointment(tenantId, {appointmentId}): Promise<{ok: boolean, data?: {success: boolean}, error?: string}>`
    3.  **Validation:** Every tool call must be `zod-validated` against its input parameters.
    4.  **Auditing:** Every tool call must generate a `logPlatformEvent('agent.calendar.<op>')` with relevant metadata (no PII beyond IDs/emails needed for ops).
    5.  **Return Format:** Each tool must return a uniform `{ok: boolean, data?, error?, conflictDetails?}` structure.
    6.  **Autonomous Outbound:** Confirmed. No autonomous outbound beyond already-ratified transactional paths (invites/reminders). Agent invocation itself stays manual until the orchestrator phase.
    7.  **`external_event_id` Round-Trip:** Confirmed. The `external_event_id` round-trip (RULING 244) is inherited by these tools, enabling basic update/delete propagation for mirrored events.

---
### 3. Tool Manifest & Documentation

**RULING 250: Implement Agent Tool Manifest and Documentation.**

*   **Decision:** The implementation of a Tool Manifest and documentation is **APPROVED**.
*   **Action:**
    1.  **Tool Manifest:** Export a `TOOL_MANIFEST` (or similar) JSON object from `lib/agent/tools/calendar-tools.ts` containing `name`, `description`, and JSON-schema `params` for each tool function.
    2.  **Documentation:** Document this in `docs/AGENT-TOOLS.md`, describing the purpose, parameters, and expected output of each calendar tool.
*   **Rationale:** This provides a discoverable and machine-readable interface for future agent runtimes and MCP integration.

---
### 4. Verification

**RULING 251: Verification Strategy for Agent Calendar Tools.**

*   **Decision:** The proposed verification strategy is **APPROVED**.
*   **Action:** Conduct a VA round-trip test on an UNCONNECTED test calendar:
    1.  `getAvailability`
    2.  `bookAppointment`
    3.  `findAppointments`
    4.  `rescheduleAppointment` (including a conflict scenario, then retrying with `force: true`)
    5.  `cancelAppointment`
*   **Verification Points:** Confirm that each step returns the expected `{ok, data?, error?, conflictDetails?}` format, internal DB state is correct, and audit logs are generated.

---
**Documentation Filing:** The `docs/GHL-PARITY.md` matrix will be updated to reflect the agent tool layer.

---
DECISION-LOG
[D-248] rule_implement_calendar_visibility_phase_a — Ruled implementation of Calendar Visibility Phase A (status: ruled)
[D-249] rule_implement_agent_calendar_tool_layer — Ruled implementation of Agent Calendar Tool layer (status: ruled)
[D-250] rule_implement_agent_tool_manifest_documentation — Ruled implementation of Agent Tool Manifest and documentation (status: ruled)
[D-251] rule_verification_strategy_agent_calendar_tools — Ruled verification strategy for Agent Calendar Tools (status: ruled)