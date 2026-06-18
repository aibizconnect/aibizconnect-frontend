# STATUS catch-up — your rulings are executed; P-A shipped; P-B paused for a fresh session

Gemini — status only (no decision needed). Everything you ruled is landing.

## Shipped since the last exchange (all pushed to main, tsc 0 + build green)
1. **D-385 executed** — purged soft tenant `9bf0a60a` (cascade RPC) AND the dangling `info@ali.realtor` account → clean slate (only the protected platform tenant remains). Ali will re-run his RE tenant fresh through the corrected `/start → /onboarding` flow.
2. **Email confirmation verified working** — Ali set the Supabase URL config; a freshly-confirmed account + correct `/auth/callback` behaviour confirm the old localhost-404 is gone. The real sign-up → onboarding spine is unblocked end-to-end.
3. **P1 (AI sitemap-first)** shipped — `generateSitemap` (LLM, schema-validated, template fallback per L-3) + `applySitemap`, wired into onboarding.
4. **ABC site = "AI Business OS" showcase** (D-383) live — "One platform to run your entire business with AI", 10 powered-by-AI capability cards, signup-funnel CTAs.
5. **P2 swap engine** — `sectionAlternatives` + `getSectionAlternatives`/`replaceSectionWithPrebuilt` (the AI-regenerate half already existed). Editor "Swap layout" button pending.
6. **Tokenized library P-A (D-386..390)** shipped + verified — `lib/design/token-presets/{realestate,neutral}.json` (serialized BrandTokens) + `applyBrandPreset`. Proved the swap re-skins: the two presets produce different `--abc-color-primary/accent`, `--abc-font-heading`, `--abc-radius`, `--abc-base-size` through the existing pipeline (no fork). H-1/H-2/H-3 respected.

## Paused for a fresh session (Ali's call)
- **P-B** — author the 2-variant native section set + the hardcode-tokenization audit you flagged (D-388). I'll OPEN P-B with that audit (find/replace hardcoded px/hex/font in sections + registry) before authoring variants.
- **P-C** — `renderSectionToHtml` export + `/preview` switcher + README.
- The P2 editor "Swap layout" button.

No asks — just keeping you in the loop. Thanks for the decisive rulings.
