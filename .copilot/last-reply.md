Ali — Report #46 is filed and this becomes the official Blueprint v3.2 — Calendar Visibility Model (D‑260) Milestone, the authoritative ruling on who sees which calendars across single‑user, multi‑user, and franchise deployments.

This is now the canonical visibility model for the entire scheduling system.

BLUEPRINT v3.2 — CALENDAR VISIBILITY MODEL (D‑260 Filed)

(Three‑phase model ratified — Phase A shipped)

1) Ali’s Ruling — Three‑Phase Visibility Model (FILED)

This ruling defines the long‑term architecture for calendar visibility across:

Small teams

Multi‑user tenants

Corporate/franchise organizations

Filed under Calendar Visibility Protocol.

PHASE A — NOW (NO SCHEMA CHANGES)
Status: SHIPPED
Rules:

Every user in a tenant sees ALL calendars

This matches real small‑team behavior (receptionists book for everyone)

Calendars display a HOST badge using existing assigned_to_email

Calendar filter gains a “My calendars” quick toggle

Defaults ON for assignees

Zero friction for single‑user tenants

Zero confusion for multi‑user teams

Why Phase A first:

Zero schema

Zero migration

Zero risk

Immediate clarity for all tenants

Filed under Calendar Visibility A.

PHASE B — Tenant Roles (WITH tenant_users)
Status: Planned — builds on Ali’s go
Rules:

Tenant membership gains:

owner

admin

member

GHL‑style “only assigned data” flag

Restricted members see:

Only calendars assigned to them

Calendars explicitly shared with them

Enforced server‑side in:

listCalendars

listEntriesRange

Integrates with the existing auth‑hook plan

Why Phase B:

Enables real multi‑agent teams

Prevents accidental cross‑visibility

Prepares the ground for org‑level rollups

Filed under Calendar Visibility B.

PHASE C — Corporations / Franchises (ORG LAYER)
Status: Planned — requires org model
Rules:

Each LOCATION = its own tenant

All data (calendars, contacts, booking pages) stays local

HQ receives:

org_admin membership

tenant switcher

cross‑tenant rollup reporting (later)

Pricing naturally becomes per‑location

Why Phase C:

Preserves franchisee privacy

Avoids cross‑location data bleed

Matches real brokerage/franchise structures

Enables future RLS and org‑level analytics cleanly

Explicitly Rejected:

location_id inside one tenant  
Because it:

Breaks contact isolation

Complicates future RLS

Fights the org‑layer model

Makes rollups harder, not easier

Filed under Calendar Visibility C.

2) Phase A Implementation — SHIPPED

HOST badge live

“My calendars” quick toggle live

No schema changes

Zero migration

Immediate clarity for all tenants

Filed under Calendar Visibility A — Implementation.

3) Additional Milestones Shipped This Hour (FILED)
A. App‑wide Time‑Zone Dropdowns (SHIPPED)

Commit 158742d

All free‑text TZ fields replaced

Uses the curated D‑253 list

Shared module extracted

Live GMT offsets everywhere

Toronto‑first ordering

Filed under Timezone Standardization Protocol.

B. External Tracking Relocated (SHIPPED)

Removed from tenant Settings

Removed tenant fallback from public renderer

tracking-actions.ts deleted

Website Editor’s Tracking & Scripts is now the single source of truth

Filed under Tracking & Scripts Protocol.

C. SMS Channel Live (SHIPPED)

Twilio verified

Real SMS delivered to Ali’s phone

Reminder engine + confirmations now SMS‑capable

DDL through 0051

Filed under SMS Channel Activation.

Blueprint v3.2 Status — Calendar Visibility Model v1 is RATIFIED

The platform now has:

Phase A visibility live

Phase B ready to build with tenant_users

Phase C defined for org/franchise deployments

Timezone dropdowns app‑wide

External Tracking unified

SMS channel live

DDL through 0051

Ali — the visibility model is now locked in.
Standing by for your next directive.

Edit in a page