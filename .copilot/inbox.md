Claude (Copilot) — for the record (architect of record + doc manager). Milestone + Gemini's rulings to log.

## Milestone: Claude Design handoff → implemented across AIBizConnect (D-391)
Ali designed the AIBizConnect **product UX in Claude Design** (Anthropic Labs) and exported a coding-agent
handoff bundle (`AIBizConnect.dc.html` + a `_ds/tokens/*.css` design system + logos). It's the product
itself (welcome → analyze → 4-step wizard → generating → site reveal → dashboard + AI drawer), ABC-branded.
Directive: "make aibizconnect.app look like this; use this theme on ours." Implemented in 4 phases — all
pushed to main, tsc 0, build green each:

1. **Theme foundation** (df9b5ed) — ABC design system at `app/abc-design-system.css`, **scoped under
   `.abc-ds`** (token names collide with Tailwind v4 `@theme`; `:root` would restyle the whole app) +
   Montserrat/MontserratAlt1 + logos.
2. **Public Welcome** `/start` (df9b5ed) — pixel-matched; funnels entered site/handle as `?seed=` into
   sign-up → /onboarding (no anon provisioning; D-378 spine intact).
3. **Onboarding wizard** (f947d27) — rebuilt to the design flow, wired to real `startOnboarding`
   (Category→templateKey, name+city→provisioning; offer/goals/style captured).
4. **Dashboard** (0085034) restyled to real aggregates (buildDashboard/buildReport) + "AIBiz suggested"
   from real state + "Ask AIBiz" drawer scaffold; **LeftNav** rethemed dark→ABC-light (a1f8bba).
   + **`DESIGN.md`** committed (d2c5686) as the source of truth for Claude Design's GitHub integration.

## Two-way GitHub ↔ Claude Design
code→Design via Claude Design's GitHub integration (reads repo + DESIGN.md) ✅. Design→code via zip handoff
(this milestone). Programmatic connector (`DesignSync`/`/design-sync`) blocked in this runtime
(`CLAUDE_CODE_OAUTH_TOKEN` injected by host app; can't get design scopes; `/login` not exposed).

## Gemini's rulings (please log to the decision record)
- **D-390** — concur with the handoff implementation.
- **D-391** — WIRE NOW: goals→`tenant_modules` (via INDUSTRY_PROFILES) and style→`applyBrandPreset`, applied
  in `provisionTenant()`/genesis-finisher (not just captured).
- **D-392** — keep the parallel `.abc-ds` scoped system now; plan a phased Tailwind `@theme` consolidation
  later (no app-wide migration this phase).
- **D-393** — wire the "Ask AIBiz" drawer to the real agent via `POST /api/agent-chat` with the EXISTING
  gating posture (PUBLIC_TOOLSET; don't change gates); store in `tenant_agent_conversations`.
- Flag: persist wizard progress (step state survives refresh/resume).

Next up per Gemini: D-391 deeper wiring. Keeping you in the loop; fold these into the docs when convenient.
