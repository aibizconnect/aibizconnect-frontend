# App-wide Menu & Tab Audit — every left-nav area, wiring-verified

Date: 2026-06-11. Method: six parallel code audits tracing every visible control →
server action → Supabase table, with broken claims re-verified by hand before acting.
Companion to docs/GHL-PARITY.md (Calendars + Contacts detail). Status: ✅ operational &
wired · 🔧 fixed this round · 🗑 deleted this round · ⏳ phased/planned · 🚫 excluded by rule.

## The verdict per left-nav item

| Menu item | Tabs / surfaces | Wiring | Status |
|---|---|---|---|
| Launchpad | progress, 8 step verifiers, re-check/skip, follow-up reminders (drafts-only) | tenant_onboarding, tenant_onboarding_followups, tenant_settings | ✅ (SMS channel stubbed until Twilio live) |
| Dashboard | 4 KPI cards, Resume-setup card, tool links | **was hardcoded "0"** → now live from lib/reporting.ts (same aggregates as Reporting), safe() fallbacks | 🔧 fixed (D-245) |
| Calendars | Calendar / Appointments / Settings, booking pages, connections, conflicts | see GHL-PARITY.md — fully live incl. personal-calendar conflicts (D-241..D-244) | ✅ |
| Contacts | Smart Lists / Bulk / Restore / Tasks / Companies + detail | see GHL-PARITY.md | ✅ |
| Opportunities | kanban: stages, deal CRUD, drag-persist | tenant_pipelines, tenant_opportunities | ✅ |
| — Opportunities detail scaffold | pipelines/[pipelineId] + PipelineColumn + CreateDealModal | fetched nonexistent /tenants/:id/pipelines + /deals (always failed) | 🗑 deleted (D-246) |
| Tasks | rollup: add/filter/toggle/delete, overdue highlight, contact links | tenant_contact_tasks | ✅ |
| AI Agents | composer (dry-run), approvals queue, domains, templates, design toggle | agent_runs, agent_approvals, tenant_domains, website_pages | ✅ (dry-run + approval gates by design) |
| Automation | workflow CRUD, trigger/step editor, publish | tenant_workflows | ✅ definitions; **engine** (enrollment + step execution) is ⏳ phased — see AUTOMATIONS-ENGINE-PLAN.md (D-248). "AI build" relabeled "Quick build" (recipes are deterministic). Publish copy now states the engine status honestly. |
| Sites | hub grid, pages (website-scoped ✓), funnels (full CRUD + AI + critic-gated publish), assets, popups, settings (per-website ✓), domains/email | websites, website_pages, website_funnels, saved assets/popups tables | ✅ (Blogs/Forms/Portal/Stats/Sales/Security/Events = labeled "soon") |
| Strategy | topic map / priority queue / 12-week calendar, generate | tenant_content_strategy | ✅ (deterministic generator) |
| Tools | 26-tool hub, runner (LLM + fallback), profile, drafts library, exports | tenant_tool_profile, tenant_tool_runs | ✅ (Wave-2 media tools gated on third-party keys); Saved-drafts link added on tool pages 🔧 |
| Education | course generate/blank/publish/delete, lesson CRUD, public /learn | tenant_courses, tenant_lessons | ✅ (lessons templated, not LLM-refined — by design for now) |
| Media Storage | upload, stock, AI, Canva/Drive, folders, system library, quotas | media, media_folders | ✅ FROZEN (commit c0ea39d — audit only) |
| Reputation | stats, distribution, moderation (publish/hide/delete), public review link | tenant_reviews | ✅ (review-request sending deferred — no-auto-send) |
| Reporting | 7 KPI cards (clickable), pipeline-by-stage, recent activity | live aggregates with safe() fallbacks | ✅ |
| Team | list, add member, role guardrails, deactivate, audit | Supabase Auth admin + platform_audit_log | ✅ |
| Settings | 10 tabs, ~40 controls: business, social/Twilio/Shopify, Stripe/PayPal, KYC, tracking, tags, custom fields/values, scoring, audit, prefs | tenant_settings, tenant_integrations, tenant_secrets (encrypted), tenant_tags, tenant_custom_fields/values, tenant_scoring_rules, platform_audit_log | ✅; OAuth/KYC sections now auto-reload on tab focus 🔧 |
| Account | password change | Supabase Auth | ✅ |
| "Soon" items | Ask AI, Conversations, Payments(nav), Marketing, Community, App Marketplace | labeled placeholders in the nav, no dead pages | ✅ honest |

## Legacy debt removed this round (D-246/D-247 + expanded D-249)

The pre-rebuild app was still in the repo, orphaned and broken (placeholder
`Bearer YOUR_JWT` fetches to endpoints that never existed; zero inbound links):

- `app/dashboard/[tenantId]/` — entire 22-page legacy tree (agent, analytics, audit,
  billing, builder, logs, settings, theme, triggers, users, workflows) + its Sidebar
  + TenantDashboard component
- `app/workflows` + `app/api/agent/runWorkflow` (hardcoded localhost:4545 proxy)
- `app/tenants/[tenantId]/workflows/[runId]` + WorkflowRunDetail (fetched nonexistent /audit route)
- `app/tenants/[tenantId]/pipelines/[pipelineId]` + PipelineColumn + CreateDealModal
- Orphan top-level `app/clients`, `app/logs`, `app/tasks` (real Tasks lives under /tenants)

`app/templates` kept — linked from the marketing how-it-works page. Build verified
green after all deletions (1,289 lines removed).

## False alarms (checked, fine)

- "Pages/settings not website-scoped" — they are: actions.ts:534 or-filters by
  website_id; website_brand_settings upserts on (tenant_id, website_id).

## Open follow-ups (queued, not built)

1. **Automations engine** — the one real functional gap: definitions save, nothing
   enrolls/executes yet. Phased plan in docs/AUTOMATIONS-ENGINE-PLAN.md (D-248).
2. Twilio-backed SMS sends (launchpad reminders, future workflow steps) — blocked on
   connected Twilio + approval gates.
3. Review-request sending — same no-auto-send gate.
4. Inbound two-way calendar sync (D-244 deferral).
