# Automations Engine — phased design (D-248, not yet built)

Status: PLAN ONLY. Ratified by the peer loop during the 2026-06-11 app-wide audit:
workflow *definitions* (tenant_workflows: trigger + steps + publish status) are fully
wired; no engine exists to enroll contacts or execute steps. Build proceeds in the
phases below on Ali's go. Standing rules baked in: **no-auto-send / no-auto-charge** —
send/SMS steps stay draft-gated behind connected channels + explicit approval forever.

## Phase E1 — Trigger ingestion + enrollment (no side effects)
- Emit domain events from existing wired paths: `form_submitted` (booking + site forms),
  `contact_created` (CRM), `appointment_booked` (calendars), `tag_added` (bulk/inline).
- New table `tenant_workflow_enrollments` (tenant_id, workflow_id, contact_id, step_index,
  state: active|waiting|done|failed, wake_at, created_at, updated_at) — DDL via queue.
- On event: match published workflows by trigger → insert enrollment. Nothing executes.
- UI: enrollment count per workflow (the `enrolled` column goes live), per-workflow
  enrollment list tab.

## Phase E2 — Step engine for SAFE steps only
- Cron-driven worker (same pattern as launchpad followup-worker, manual-trigger button
  for admin): advance enrollments through `wait`, `add_tag`, `add_score`, `if_else`,
  `notify` (in-app notification only). All writes audited (`automation.step.*`).
- `send_email` / `send_sms` steps: engine *drafts* the message into an approvals queue
  (reuse agent_approvals pattern) and pauses the enrollment until approved — approval
  sends via the tenant's connected channel; denial skips the step. No background sends.
- Failure policy: 3 retries with backoff, then enrollment marked failed + surfaced in UI.

## Phase E3 — Operational surface
- Runs/history tab per workflow (from enrollments + audit), pause/resume workflow,
  re-enroll, test-run against a chosen contact (dry-run preview of step outcomes).
- Metering: enrollment counts per tenant feed entitlements later.

## Non-goals (until separately ruled)
- Autonomous outbound of any kind; payment/charge steps; cross-tenant triggers;
  webhook receivers from third parties (needs auth design first).
