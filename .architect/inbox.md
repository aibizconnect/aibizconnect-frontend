# Milestone: Claude Design handoff → implemented across AIBizConnect (D-391)

Architect review requested. Context + what shipped + 3 decisions I want your read on.

## Context
Ali built the **AIBizConnect product UX in Claude Design** (Anthropic Labs' design tool) and exported a
coding-agent **handoff bundle** (`AIBizConnect.dc.html` + a `_ds/tokens/*.css` design system + logos).
It's NOT a tenant website — it's a clickable prototype of OUR product: welcome → analyze → 4-step wizard
(profile/offer/goals/style) → generating → site reveal → dashboard (Overview/Leads/Social/Insights) + AI
drawer. Directive: "make aibizconnect.app look like this; use this theme on ours." Treat as the ABC
platform (placeholder content is generic, not real-estate).

## Shipped (4 phases, all built+pushed, green build each)
1. **Theme foundation** — installed the ABC design system at `app/abc-design-system.css`, **scoped under
   `.abc-ds`** (its token names `--text-*/--radius-*/--shadow-*/--font-sans` collide with Tailwind v4's
   `@theme`, so `:root` would restyle the whole existing app). Opt-in per surface. + Montserrat/MontserratAlt1
   fonts + logos. (df9b5ed)
2. **Public Welcome** at `/start` — pixel-matched, funnels the entered site/handle as `?seed=` into
   sign-up → /onboarding (no anon provisioning; honors the D-378 spine). (df9b5ed)
3. **Onboarding wizard** rebuilt to the design flow, wired to the REAL backend (`startOnboarding`):
   Category→our industry templateKey, name+city→provisioning; offer/goals/style captured (API strips
   unknown keys). Generating runs real provisioning under the animation; reveal links to real
   launchpad/preview. (f947d27)
4. **Dashboard** restyled to the Overview design wired to REAL aggregates (buildDashboard/buildReport) —
   KPIs, contacts chart, recent activity, "AIBiz suggested" derived from real state (not faked) + an
   "Ask AIBiz" drawer (composer is an honest scaffold — engine still gated). (0085034)
   Plus **LeftNav** rethemed dark→ABC-light so the chrome matches. (a1f8bba)
   + `DESIGN.md` committed as the design-system source of truth for Claude Design's GitHub integration. (d2c5686)

## Two-way GitHub ↔ Claude Design (status)
- **code→Design**: Claude Design's GitHub integration reads our repo + `DESIGN.md` (Ali connects it). ✅
- **Design→code**: zip handoff works (this milestone came from it). The PROGRAMMATIC connector
  (`DesignSync` / `/design-sync`) is **blocked in this runtime** — auth is a `CLAUDE_CODE_OAUTH_TOKEN`
  injected by the host app (not an OS env var; verified), can't be granted design scopes, and `/login`
  isn't exposed here. Auto-PR loop would need a Claude Code session whose login carries design scopes.

## Decisions I want your read on
1. **Deeper wiring now or later?** goals→`tenant_modules` (Genesis blueprint) and style→`applyBrandPreset`
   (token presets) are currently *captured but not applied*. Worth wiring now while the flow is fresh, or
   ship the look first and wire in a follow-up?
2. **`.abc-ds` scoping vs. full migration.** I scoped the design system to opt-in to avoid breaking the
   existing Tailwind-v4 app. Long-term: keep the parallel scoped system, or migrate the app's Tailwind
   `@theme` to these tokens so it's one system? Risk/benefit?
3. **AI assistant drawer.** It's a scaffold (automations engine gated). When/how should the "Ask AIBiz"
   drawer get wired to the real agent — and does that change the gating posture?

Reply with: concur/adjust per phase, your call on the 3 decisions, and anything I'm missing.
