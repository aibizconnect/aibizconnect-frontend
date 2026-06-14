# Tenant Genesis Protocol

**Ali's directive (2026-06-14):** "We have to have a protocol in place to give every tenant full functional websites with forms, funnels, CRM, automation — and they can ask AI to add more and fix others."

This is the standing standard for what a tenant receives and how AI extends it. Two halves: **(A) the Genesis guarantee** (what every tenant lands with) and **(B) the AI Build/Fix loop** (how they grow it by asking).

> Scope note: per the ONE TENANT rule, tenants are NOT created without Ali's explicit ask. This protocol governs what happens *when a tenant is onboarded* — not provisioning new tenants now.

---

## A. The Genesis guarantee — what every tenant gets on day one

A tenant is "Genesis-complete" only when ALL of the following exist and are wired:

1. **A complete website** (not just a home draft): Home · About · Services · Pricing · Contact · FAQ, plus a starter **funnel** (Free Guide → Thank You → Get Started). Brand applied (colors + fonts), AI-drafted copy per page.
2. **Forms → CRM**: the Contact page form (incl. a Message/Comment field) posts to `/api/leads/submit` → a `tenant_contacts` row, tagged `website lead`.
3. **Booking on-site**: a Calendar element on Contact, bound to the tenant's default calendar.
4. **CRM ready**: a default **Sales Pipeline** (+ stages), a starter **tag set** (website lead, customer, do not contact…), and the core **custom fields**.
5. **An AI agent enabled** (webchat channel on) so the live site captures leads + books appointments out of the box.
6. **Starter automation that actually runs today** (the set that does NOT need the unbuilt engine): lead-capture→CRM, onboarding follow-up reminders, appointment confirmations/reminders, review-request flow, trigger-link tagging, lead scoring.

**Acceptance:** the finish step emits a **Genesis Report** listing every page, the wired form, the pipeline/tags, the agent, and the installed starter automations — and flags anything missing.

---

## B. The provisioning pipeline (repeatable, ideally one click)

| Stage | Does | Acceptance check |
|---|---|---|
| 0 Intake | business name, niche, city, tone, logo, AI consent | required fields present |
| 1 Brand | palette + fonts → `website_brand_settings` | brand row exists |
| 2 Pages | AI-draft the FULL sitemap (not just Home) → `website_pages` + sections | every planned page created with sections |
| 3 Wire | Contact form → CRM; Calendar element → default calendar | form posts a contact; booking resolves a calendar |
| 4 Seed CRM | ensure pipeline, tags, custom fields | `ensurePipeline` + tags present |
| 5 Agent | create/enable a webchat AI agent | agent enabled, webchat on |
| 6 Automations | install the runnable starter set | starter rows present |
| 7 Review | Genesis Report + publish gate | report shows 0 gaps |

Today the wizard does Stages 0–2 well but **finishes only the Home page** and skips 3–6. Closing that is gap **G1** below.

---

## C. The AI Build/Fix loop — "ask AI to add more / fix others"

**The engine already exists.** A supervised website agent (`lib/agent/domains/website.ts`, `lib/agent/execute.ts`, `lib/agent/supervisor.ts`) can already call `createPage`, `updatePage`, `createSection`, `updateSection`, `createBlock`, `updateBlock`, `attachSectionToPage`, `updateNavigation`, and the `list*` tools — executed through `/api/agent/execute` behind a **supervisor pre-commit gate** (safety + tenant validation). This is how "add a pricing page" or "fix the contact form" gets done.

What's missing to make it a tenant-facing loop:
- **A surface**: an "Ask AI" panel in the editor (and/or the tenant assistant) that sends the request to the supervisor agent and shows a diff/preview before commit.
- **Wider tools**: the agent currently edits *pages/sections/nav* only. To cover "forms, funnels, CRM, automation," add tools for **funnels** (create funnel + steps), **CRM** (pipeline/stage/tag/custom-field), and **automations** (create/edit a workflow definition). Build/marketing tools beyond website are currently `stub` in the registry.
- **Preview + undo**: every AI change lands as a reviewable draft (page versioning already exists) with one-click revert.

Public chat agents stay read-limited (book + capture lead only) — editing power is admin/owner-gated, never exposed to site visitors.

---

## D. Gaps → phased build

- **G1 — Genesis finisher** *(buildable now, no new external deps)*: extend wizard finish to produce the full site + wire form→CRM + seed pipeline/tags/fields + enable an agent + install starter automations + emit the Genesis Report. Turns "draft home" into "Genesis-complete."
- **G2 — AI Build/Fix surface + tools** *(buildable now)*: expose the existing supervisor website agent as an in-editor "Ask AI" loop with preview/commit, then expand its toolset to funnels + CRM + automation definitions.
- **G3 — Automations EXECUTION engine (E1–E3)** *(GATED — needs Ali's explicit go; see `AUTOMATIONS-ENGINE-PLAN.md`)*: today only workflow *definitions* exist; no engine enrolls contacts or runs steps. E1 = trigger ingestion + enrollment; E2 = safe-step execution (wait/tag/score/notify; send steps stay draft-gated forever); E3 = runs/history UI. Until E1 ships, "automation" in the Genesis guarantee = the runnable starter set in A.6 only.

---

## E. Guardrails (carry every law forward)

- **Native elements only** — AI emits OUR element types; nothing foreign in Tree/Canvas.
- **Spacing cap ≤ 40** — every AI-set spacing/padding clamped.
- **Drafts-only law** — no AI auto-send / auto-charge, ever; send/SMS steps stay approval-gated.
- **Supervisor gate** — every AI write passes `lib/agent/supervisor.ts` (tenant scoping + safety) before commit.
- **ONE TENANT rule** — never create a tenant without an explicit ask.
- **Peer review** — material protocol changes go through the architect/Copilot loop first.

---

## F. Open decisions (need Ali)

1. **Greenlight G1 (Genesis finisher)** — extend provisioning to Genesis-complete.
2. **Greenlight G2 (AI Build/Fix loop)** — surface the existing AI editor + expand tools to funnels/CRM/automation.
3. **Greenlight G3 (automations engine E1)** — unblock the execution engine, or keep it gated and ship Genesis with the runnable starter automations only.
