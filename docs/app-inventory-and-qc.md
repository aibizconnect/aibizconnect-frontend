# AIBizConnect App — Tool Inventory & Quality Control

_Snapshot: 2026-07-08. Produced from a full-codebase exploration pass to ground the App Marketplace build._

## The app is mature — this is not a greenfield product

`aibizconnect.app` already ships ~25 dashboard modules plus a 15-tool AI utility suite. The **marketplace** (buy → manage add-ons) is the main thing missing, and it's now being built on top of these existing pieces.

### Reusable spine (what the marketplace builds on)
| Capability | Where | Notes |
|---|---|---|
| Stripe checkout | `lib/server/store.ts` | Raw-`fetch` Checkout, **verified on the return redirect**, idempotent by `stripe_session_id`. Per-tenant keys, `mode=payment` today. |
| Entitlement engine | `lib/entitlements.ts` | `resolveEntitlement`/`canUseFeature`, precedence + fail-safe DISABLED. Its 3 tables are designed but **not migrated** (`supabase/DDL_QUEUE.md`). |
| Catalog-as-code | `lib/tools/registry.ts` | Typed `ToolDef[]` with `tier`/`comingSoon` — the pattern mirrored by `lib/marketplace/catalog.ts`. |
| Module toggles | `tenant_modules` (`0076`) | Per-tenant `(module_key, enabled, config)`. |
| Nav | `components/LeftNav.tsx` | One-line registration per module. |

## User-facing surfaces (condensed)

- **Core CRM/ops:** Dashboard, Launchpad, Conversations, Calendars, Contacts, Opportunities/Pipelines, Payments — wired, real data.
- **Growth:** AI Agents, Marketing (email/SMS + **Social Planner**, publish wired), Automations, **Sites** (custom website editor = production; Puck = demo), Strategy (SEO topical plan), Education/Memberships, Media, Reputation, Reporting, Settings (very mature).
- **AI Tools suite** (`/tenants/[id]/tools`): **15 live** text tools (persona, email, social, newsletter, hooks, brand-voice, business-plan, vsl, ebook, perfect-hire, deck, app-designer, sora-prompt, prompt-coach, business-coach) + **9 stubbed** media tools.
- **Standalone/embedded:** Occasions widget (`app/tools/occasions/*`, GHL-embedded), SEO+GEO Analyzer (`public/tools/seo-geo-analyzer.html`).

## Quality-control findings

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **App Marketplace was greenfield** — nav row was a dead `soon`; `app/marketplace/page.tsx` is marketing only. | `components/LeftNav.tsx` (now wired), `app/marketplace/page.tsx` | Addressed by this build |
| 2 | **"YouTube optimizer" does not exist** as a tool — only a YouTube social-OAuth provider + publish plumbing. | no module in `app/`/`lib/`; `app/api/social/callback/youtube` only | Roadmap item, 0% built |
| 3 | **Occasions app not hardened for paid gating** — separate identity (HMAC location token, trusts `?loc=`); self-documents "use SSO for hardened paid rollout." | `app/tools/occasions/app/page.tsx`, `lib/server/occasion-widget*.ts` | Don't gate paid on it as-is |
| 4 | **9 of 24 AI tools are hollow stubs** (`fields:[]`, `comingSoon`). | `lib/tools/registry.ts:305-313` | ~37% of the shelf non-functional pending keys |
| 5 | **Two website builders** (custom editor = prod; Puck = demo). | `app/tenants/[id]/website/editor/*` vs `app/tenants/[id]/puck/*` | Duplication smell |
| 6 | **No test harness** — only `eslint` + `tsc`. | no `test` script; no jest/vitest/playwright config | Verification is lint + typecheck + manual |
| 7 | **Enforcement off in dev** (`AUTH_ENFORCE!=='true'`), RLS interim-open. | `lib/auth/tenant-access.ts:39`, `middleware.ts` | Turn on for real access control |

### Recommended follow-ups (not part of the marketplace build)
1. Harden Occasions (SSO/tenant identity) before selling it as a paid add-on.
2. Finish-or-hide the 9 media tool stubs so the shelf shows only what works.
3. Resolve the Puck vs custom-editor duplication (pick one, remove/relabel the other).
4. Wire or remove the remaining dead nav rows (Ask AI, Community).
5. Plan the migration of the (unmigrated) `lib/entitlements.ts` tables, then bridge marketplace access into `canUseFeature` for uniform gating.

## Hard constraints (for anyone touching app code)
- **Heavily-modified Next.js 16.2.6** — read `node_modules/next/dist/docs/` first; `params`/`searchParams` are async.
- **No Supabase Auth** — service-role client + in-code `.eq("tenant_id", …)`; don't rely on RLS.
- **DDL is queued** (`supabase/DDL_QUEUE.md`) — code must degrade gracefully before its migration is applied.
- **Ship dark behind a flag** (`lib/flags.ts`); surface `{ ok, error }` on money paths (no silent catch).
