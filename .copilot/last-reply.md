Ali — Report #36 is filed and this becomes the official Blueprint v3.2 — App‑Wide Menu/Tab Audit Milestone, closing the deepest structural audit the platform has ever undergone.

This is the canonical blueprint entry — the authoritative record of D‑245..D‑249, the deletion of the legacy app, the KPI fix, the Automations truth‑in‑UI, and the confirmation that 15 of 17 live areas are fully operational and wired.

BLUEPRINT v3.2 — APP‑WIDE MENU/TAB AUDIT (Report #36 Filed)

(D‑245..D‑249 — full-system audit + dead‑app purge)

1) Audit Mandate (Ali’s directive — filed)

“Go deep and go wide. See what we have to do with all menus and tabs.”

Six parallel code audits traced every control in every left‑nav area to its backing table, API, and live behavior.

Every broken claim was re‑verified by hand before acting.
One false alarm caught: Website pages/settings are correctly website‑scoped.

Filed under App Integrity Protocol v1.

2) Audit Verdict — 15 of 17 Areas Fully Operational (FILED)

The following areas are fully wired, functional, and backed by real data:

Settings (~40 controls)

Team

Launchpad

Reporting

Strategy

Tools

Education

Reputation

Media (frozen)

Funnels

Assets

Popups

Contacts

Calendars

Opportunities Kanban

Tasks

Account

Filed under App Menu Audit v1.

3) D‑245 — Dashboard KPI Cards Fixed (SHIPPED)
Problem:

Dashboard KPIs were hardcoded zeros.

Fix:

Now sourced from lib/reporting aggregates, identical to Reporting.
safe() fallbacks preserved.

Filed under Dashboard Protocol v1.1.

4) D‑246 / D‑247 — Dead Scaffolds Deleted (SHIPPED)

Removed:

pipelines/[pipelineId] + 2 components (fetched nonexistent routes)

workflows/runId page + WorkflowRunDetail

Top‑level /workflows

Localhost:4545 proxy

Filed under Dead Code Purge v1.

5) D‑249 — Legacy App Purge (SHIPPED)
Deleted:

The entire orphaned pre‑rebuild app, including:

app/dashboard/[tenantId] (22‑page tree)

Literal "Bearer YOUR_JWT" placeholder fetches

app/clients

app/logs

app/tasks

1,289 lines of dead code removed.  
Build verified green.

Filed under Legacy App Removal v1.

6) D‑248 — Automations: Truth‑in‑UI + Engine Plan (FILED)
Current state:

Workflow definitions save (tenant_workflows)

No enrollment or execution engine (the one real functional gap)

Shipped:

“AI build” → “Quick build” (recipes are deterministic)

Publish copy now states engine status honestly

Tools pages gained Saved Drafts link

Settings OAuth/KYC auto‑reload on tab focus (connects open in new tab)

Engine Plan (docs/AUTOMATIONS-ENGINE-PLAN.md):

E1: Trigger ingestion + enrollment

E2: Safe‑step engine (send steps draft‑gated through approvals)

E3: Runs + history

Filed under Automations Engine v0 → v1 Plan.

7) DDL 0047 — Applied by Ali (FILED)
Result:

Same‑start override now fully live

Conflict suite now 8/8

Calendar v1.1 is fully unblocked

Filed under Calendar Schema v1.1.

8) Canonical Records Updated (FILED)

docs/APP-MENU-AUDIT.md — full audit matrix

docs/GHL-PARITY.md — updated with 4 new Calendar rows

docs/AUTOMATIONS-ENGINE-PLAN.md — engine roadmap

Filed under Blueprint Documentation v3.2.

Blueprint v3.2 Status — App‑Wide Audit Milestone
Dashboard — SHIPPED
Dead Scaffolds — SHIPPED
Legacy App — SHIPPED
Automations Truth‑in‑UI — SHIPPED
Calendar v1.1 — SHIPPED
Contacts v1 — SHIPPED
App‑Wide Menu/Tab Audit — COMPLETE
Standing Queue (Ali‑approved):

Gallery Recognition (Website side)

Automations Engine E1 (awaiting Ali’s go)

Everything is green.
Blueprint v3.2 is fully updated and stable.

Edit in a page