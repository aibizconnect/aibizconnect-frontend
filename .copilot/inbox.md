Claude (Copilot) — milestone for the record (architect of record + doc manager). Public-site rebuild.

## Context
Ali: the apex switch mechanism is ready but "the website is not ready — build it, THEN switch," and "redo
the design, this is not right, use the latest design instructions." Then: "ask design to build pages, put the
instructions in the local folder, give command using the browser, take back the result in the local folder,
take over the build, and report to Copilot." So we built the **autonomous design→build pipeline**.

## Shipped (typechecks; production build green; NOT pushed)
1. **Autonomous Claude Design pipeline** (no manual clicks/paste):
   - Instructions live in `design-handoffs/BRIEF.md` (full spec + send order) + `DESIGN.md` (system).
   - `scripts/design-build.mjs <Slug>` — commands Claude Design via the debug-Chrome relay (composer),
     polls the served doc until it settles, switches the editor to it, saves the SOURCE locally.
   - `scripts/claude-design-capture.mjs <Slug>` — captures the RENDERED DOM (expanded, not `{{ }}` source)
     by attaching to the design preview's cross-origin OOPIF CDP target (raw `/json/list` → iframe
     webSocketDebuggerUrl → Runtime.evaluate). Playwright can't see the OOPIF; raw CDP can.
   - Loop: BRIEF (local) → command (browser) → pull rendered+source (local) → I build native.
2. **Home REDONE high-fidelity** (`app/page.tsx`) — faithful to the Claude Design Home (the earlier generic
   translation was rejected as "ugly"). Reproduces the bespoke **navy AI-concierge chat card** + dashboard
   mock + the navy "Inside the platform" band, exact copy, all 9 bands.
3. **Pricing BUILT** (`app/pricing/page.tsx`) from the freshly-designed `Pricing.dc.html` — 4 tiers + working
   billing toggle, full compare table, power-ups, trust strip, FAQ accordion, CTA.
4. **Shared chrome** `components/marketing/abc/Shell.tsx` (AbcNav/AbcFooter/AbcPage/CtaBand/SectionHead +
   primitives) so every page is cohesive; `PricingPlans.tsx` + `Faq.tsx` client islands. The old dark-navy
   `MarketingShell` is retired from these pages. Tokens come from `app/abc-design-system.css` (`.abc-ds`).

## Decision to log
- **D-396 (Gemini ratified):** default tenant custom-domain flow = registrar CNAME/A + Vercel TXT-verify;
  NS-delegation is the "advanced/managed" option. (From the domain-switch capability built earlier this session.)

## Next (send order)
Platform → Solutions hub + Real Estate → feature pages (CRM, AI Builder, Websites & Funnels, Automations,
Consumer Portal, Marketplace, Templates) → About/Contact → Resources (Blog/Guides/Webinars). Each via the
loop, built on the shared shell. THEN flip the apex switch (capability already built & waiting on tokens).

Guardrail held: per-page visual diff (Ali views each in his debug Chrome — he can't see screenshots).
