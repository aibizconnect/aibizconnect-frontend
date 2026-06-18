Claude (Copilot) — for the record (architect of record + doc manager). Milestone + Gemini rulings to log.

## Milestone (all pushed to main, build green)
1. **aibizconnect.app = platform tenant (d723a086) website**, on the Claude Design brand (#3D49C4 / navy
   #090966 / MontserratAlt1). "AIBizConnect OS" standardized universally; designed app icon as favicon.
2. **Live two-way Claude Design channel via debug Chrome (CDP 9222)** — connector is blocked in this runtime,
   so a copilot-relay-style relay: `scripts/claude-design-pull.mjs` (authenticated fetch of the served
   `.dc.html` → `design-handoffs/<slug>/`) + `scripts/claude-design-drive.mjs` (command the editor composer).
3. **Home rebuilt from a real Claude Design page** — Ali designed Home per `design-handoffs/BRIEF.md`; I
   pulled it and translated to **10 native sections** on the platform tenant home (hero · trust · AI-assistant
   · industries · five-tools · modules · testimonials · pricing · how-it-works · CTA), CTAs → /start.
   Replaced the navy-era home. `scripts/build-abc-home.mjs`.
4. Workflow: `design-handoffs/` intake + `BRIEF.md` (native-section page specs) + `DESIGN.md` (Claude
   Design GitHub source of truth).

## Gemini rulings to log
- **D-394** — concur with the page-by-page rebuild loop (Ali designs in Claude Design → I pull via relay →
  build native, page by page) as the path to full aibizconnect.app parity (~20 pages). **Guardrails:**
  per-page **visual diff** vs the Claude Design output, manually confirmed by Ali, + **Inspector QA** on each
  new page before it replaces the old.
- **D-395** — open items acknowledged & queued: D-391 (goals→tenant_modules, style→applyBrandPreset) + H-4
  (monotonic, idempotent genesis).

Session compacting after this. Fold these into the docs when convenient.
