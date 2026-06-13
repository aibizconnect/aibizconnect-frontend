# GHL Parity Audit — every link, top to bottom

**Directive (Ali, 2026-06-13):** "Start from the top of GHL — we have it for another week — check every link to the end and make our links functional the same way." Our own designs are basic; GHL is the benchmark. This is the working checklist for the whole sweep. We walk the GHL left rail top→bottom; for each item and **every sub-tab** we record our route, real status, and the gap.

Status key: ✅ functional · 🟡 partial (works but missing sub-tabs/depth) · 🔴 placeholder/missing.

Ground truth from a full route audit on 2026-06-13 (16 routes real, see per-row notes). Our nav: `components/LeftNav.tsx`.

---

## Left rail — top to bottom

| # | GHL item | GHL sub-tabs | Our route | Status | Gap / action |
|---|----------|--------------|-----------|--------|--------------|
| 1 | **Ask AI** (copilot) | inline assistant | — (nav: "soon") | 🔴 | Defer or wire to our agent runtime. Low priority (GHL's is a floating copilot, not a page). |
| 2 | **Launchpad** | setup checklist | `launchpad` | ✅ | Real: steps + follow-up prefs. Compare GHL quick-actions, add if thin. |
| 3 | **Dashboard** | widgets, opp value, funnel | `dashboard` | 🟡 | Real KPIs. GHL has customizable widgets + pipeline funnel chart — ours is fixed cards. Add funnel/conversion widgets later. |
| 4 | **Conversations** | Inbox · Manual Actions · Snippets · Trigger Links | `conversations` | ✅ **MVP shipped (D-297..301)** | Unified inbox live: thread list + pane + composer, SMS/Email/Webchat filter, unread, inbound Twilio webhook (signature-verified), 1:1 reply (SMS+email), ContactDetail Conversations tab. **Needs:** apply migration 0057 + point Twilio number webhook here. Defer: inbound email, FB/IG/WhatsApp, Manual Actions/Snippets/Trigger Links sub-tabs. |
| 5 | **Calendars** | Calendar · Appointments · Settings | `calendars` | ✅ | Strong (D-250..264): grid, appts, availability, venues, invitees, reminders, multi-account, tz. |
| 6 | **Contacts** | Smart Lists · Bulk · Restore · Tasks · Companies · Manage Smart Lists | `contacts` | ✅ | Strong (D-229+): CRUD, smart lists, filters, bulk, import/export, Google sync, detail tabs. |
| 7 | **Opportunities** | Opportunities list · Pipelines (kanban) · bulk | `pipelines` | ✅ **shipped (D-307..310)** | Board↔List toggle, inline **pipeline switcher** (+ create), sortable/filterable list with inline stage/status/contact edit, **bulk bar** (move stage / won / lost / delete), status won/lost, link-to-contact, new-opp modal. No new schema. Fast-follow (migration 0060): owner/source/expected_close_date + soft-delete + pipeline CRUD in Settings. |
| 8 | **Payments** | Invoices · Estimates · Recurring · Subscriptions · Transactions · Orders · Products · Coupons · Settings · Integrations | `payments` | ✅ **MVP shipped (D-302..306)** | Invoices + Estimates (line items, live totals, statuses, send-as-email, mark-paid→txn, estimate→invoice convert) + Products catalog + Transactions ledger. Customer-initiated **Stripe pay link** (no charge — D-303). **Needs:** apply migration 0058. Defer (honest "soon" tabs): Subscriptions, Recurring, Coupons, Orders; Stripe auto-paid webhook = fast-follow. |
| 9 | **AI Agents** (≈ GHL AI Employee) | Agents · Conversations · Audit | `agents` | ✅ | Ours, ahead of GHL in places (real tool execution, knowledge intake, test console, metering). |
| 10 | **Marketing** | Social Planner · Emails (Campaigns+Templates) · Trigger Links · Brand Boards · Ad/Affiliate Mgr | `marketing` | ✅ **depth shipped (D-316..321)** | Email campaigns (D-280) + **SMS Campaigns** (mirror flow, draft→test→send via Twilio, audience all/tags, DND+guard-tag exclusion, STOP footer, no DDL) + **STOP auto-opt-out** in the inbound webhook + **Trigger Links** (trackable `/l/<slug>`, click count, apply-tags-on-click, migration 0060). Social Planner = deferred "soon" (D-320). Brand Boards still open. |
| 11 | **Automation** | Workflows · Campaigns (legacy) · Triggers (legacy) | `automations` | 🟡 | Workflows CRUD + recipes real. GHL workflow builder is deeper (visual canvas, many triggers/actions). Depth pass later. |
| 12 | **Sites** | Funnels · Websites · Stores · Blogs · Forms · Surveys · Chat Widget · Client Portal · URL Redirects · Preferences | `sites` | 🟡 | Websites + editor real; Funnels behind flag. **Forms shipped (D-311..315):** builder (fields/types/required/options), hosted `/f/[id]`, submissions viewer, share + iframe embed, feeds Contacts via `/api/leads/submit`+form_id (migration 0059). Surveys = "soon" tab (deferred). Still missing: Blogs, Stores, Client Portal, URL Redirects. |
| 13 | **Strategy** | — (ours, not in GHL) | `strategy` | ✅ | Ours-only differentiator (topical authority). Keep. |
| 14 | **Tools** | — (ours, not in GHL) | `tools` | 🟡 | Static registry; individual tool UIs real; media tools key-gated. |
| 15 | **Memberships** (Education) | Courses · Communities · Offers · Analytics · Settings | `memberships` | 🟡 | Courses + AI outline + lessons + public /learn real. Missing: Offers, Analytics, Communities. |
| 16 | **Community** | groups/feed | — (nav: "soon") | 🔴 | Separate product in GHL. Defer or fold into Memberships. |
| 17 | **Media Storage** | file manager | `media` | ✅ | Real (LOCKED — c0ea39d). Unsplash/Pixabay, folders, R2. |
| 18 | **Reputation** | Overview · Requests · Reviews · Listings · Widgets | `reputation` | 🟡 | Reviews + collection link + star dist real. Missing: Requests UI, Listings, Widgets. |
| 19 | **Reporting** | Google Ads · FB Ads · Attribution · Call · Appointment · Agent | `reporting` | 🟡 | Cross-module KPI aggregation real. Missing: ad-platform/attribution/call reports (need ad integrations). |
| 20 | **App Marketplace** | 3rd-party apps | — (nav: "soon") | 🔴 | Defer (needs an app platform). Keep honest "soon" or remove. |
| 21 | **Settings** | Business · Staff · Pipelines · Calendars · **Conversation AI** · **Phone Numbers** · WhatsApp · **Email Services** · Tags · Custom Fields · Custom Values · Domains · Integrations · Conversation Providers · Objects · Scoring · Audit | `settings` | 🟡 | Business, Integrations (social/Twilio/Shopify/Stripe/PayPal), KYC, Tags, Custom Fields/Values, Scoring, Audit real. Missing as dedicated panels: Phone Numbers, Email Services, Conversation AI, Conversation Providers, Objects. |
| — | **Team** (≈ GHL My Staff) | members · locations | `team` | ✅ | Real (D-282/283): roles, invites, franchise orgs. |

---

## Build order (top-down, what Ali asked for)

1. **Conversations** (#4) — the unified inbox. *In progress.* Biggest GHL-defining gap.
2. **Payments** (#8) — invoices/products/orders/estimates/coupons.
3. **Opportunities list view + multi-pipeline** (#7) — quick parity win.
4. **Sites depth** (#12) — Forms + Surveys first (lead capture is core), then Blogs.
5. **Marketing depth** (#10) — Social Planner + SMS campaigns + Trigger Links.
6. **Reputation depth** (#18) — Requests + Widgets (Listings needs an integration).
7. **Settings panels** (#21) — Phone Numbers, Email Services, Conversation AI surfacing.
8. **Memberships depth** (#15) — Offers + Analytics.
9. **Decide**: Ask AI / Community / App Marketplace — build or remove from nav (no dead placeholders).

Each item: consult Gemini (architect) → build → report Copilot → tick this list.

---

## Decisions / notes
- Anything ours-only and good (Strategy, AI Agents depth, Tools) we keep — parity means *match GHL's functional coverage*, not delete our edge.
- "Soon" rows must each end the sweep either **functional** or **removed** — Ali's standard is no dead links.
