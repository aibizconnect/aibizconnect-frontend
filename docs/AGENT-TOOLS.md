# Agent Tools — the surfaces AI agents (VAs) can operate (D-261..D-264)

Status: CAPABILITY layer shipped 2026-06-11; agent **invocation** stays manual until the
orchestrator phase. Every tool is a thin, zod-validated, audited wrapper over the same
core functions the UI uses — an agent booking an appointment gets identical behavior to
a human clicking the booking page.

## Calendar tools (`lib/agent/tools/calendar-tools.ts`)

| Tool | What it does | Inherits automatically |
|---|---|---|
| `calendar.list` | The tenant's booking calendars (id/slug/name/duration/tz/host) | — |
| `calendar.availability` | Open slots, generated in the calendar's timezone | busy exclusion across ALL of the host's connected personal calendars + buffers |
| `calendar.find` | A person's upcoming appointments by email/phone | — |
| `calendar.book` | Book a slot for a person | double-book guard, CRM contact creation, native Google/Outlook invites to booker + guests, confirmation email (verified-identity gate), reminder scheduling |
| `calendar.reschedule` | Move an appointment — refuses with a labeled conflict list unless `force` (use only after the customer explicitly confirms) | conflict engine, mirrored-event updates, attendee notifications |
| `calendar.cancel` | Cancel — frees the slot | mirrored events removed, attendees get cancellation notices |

All tools return `{ ok, data? , error?, conflicts? }` and log `agent.calendar.<op>` to the
platform audit. `CALENDAR_TOOL_MANIFEST` exports machine-readable descriptors for agent
runtimes / future MCP exposure.

## The VA conversation shape these enable

> Caller: "I'd like to move my Thursday appointment to Friday afternoon."
1. `calendar.find { phone }` → their Thursday booking
2. `calendar.availability { calendar }` → Friday's open slots
3. `calendar.reschedule { appointmentId, newStartAt }` → conflict? Tool returns the labeled
   conflict list → the agent ASKS the customer → retry with `force: true` only on a yes.
4. Provider invites update + reminders re-arm automatically.

## Safety posture
- No autonomous outbound beyond the already-ratified transactional paths (invites,
  confirmations, reminders — all channel-config-gated per calendar).
- Marketing sends remain forbidden platform-wide.
- Tools add capability only; wiring them to a live agent loop is a separate, ratified phase
  (see the agent orchestrator on the roadmap and docs/AUTOMATIONS-ENGINE-PLAN.md).

## AI Agents hub (D-274, 2026-06-12)
Tenant-facing "AI Agents" menu (app/tenants/[tenantId]/agents): create agents (role
presets, tone, instructions), Skills (Calendar LIVE via this tool layer; Contacts/
Email/SMS/Voice/Reviews = SOON), Knowledge (Business Profile auto-merged + snippets),
and a Test console running the REAL tool loop (lib/agent/agent-runtime.ts — one-JSON-
object protocol, ≤6 steps, read-only by default, LIVE actions on explicit opt-in).
Storage: tenant_ai_agents (0053 queued) with tenant_settings 'ai_agent:<id>' fallback.
LLM: provider chain OpenAI→Gemini (lib/agent/llm.ts) — Gemini carries the load while
the platform OpenAI key is over quota. Legacy Agent Mesh panel lives under the
hub's "Ops" tab.
