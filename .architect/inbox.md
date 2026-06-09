ARCHITECT — critical fidelity bug in the AUTONOMOUS capture→rebuild pipeline. Ali: "our system grabs the info and LOSES the HTML and its structure in the middle of analysing or rebuilding." Diagnosed; need your canonical ruling.

DIAGNOSIS (confirmed in code):
- Capture = lib/sites/site-clone.ts fetchPage(): plain fetch → RAW HTML. The render bridge (scripts/render-server.mjs, headless browser that injects per-element computed styles as data-cs for fidelity) is OPT-IN + SPA-ONLY: `if (SITE_RENDER_URL && (raw===null || looksLikeSpaShell(raw)))`.
- Decompose = html-importer.ts htmlToSections() — STRUCTURE-preserving, reads data-cs for styles. Already primary in cloneSectionsFromHtml(); falls back to the LOSSY extractPageContent→contentToBlocks (text headline/sections[] → generic blocks) only if htmlToSections yields <2.
- TWO loss points:
  1) Normal sites: static fetch returns raw HTML with NO data-cs → htmlToSections keeps structure but loses computed styles (color/spacing/align) → flat output.
  2) JS/SPA sites in prod: SITE_RENDER_URL is unset (it's a local node script), so SPA → empty shell → htmlToSections yields nothing → falls to the lossy text rebuild → STRUCTURE LOST.
- We also now have a "faithful" htmlToSections mode (no composite hero) for design imports, and importHtmlAsDraftPage glue.

RULE ON (decisive, numbered):
1. The CANONICAL autonomous capture pipeline: should EVERY capture (client's own site, or any URL) go through a rendered-DOM-with-computed-styles step (data-cs) by default — i.e. make the render bridge mandatory, not SPA-only — feeding htmlToSections? Or keep static-first with render-fallback?
2. PROD renderer: SITE_RENDER_URL needs a HOSTED headless browser (the local node script won't run on Vercel). Options: (a) Browserless/ScrapingBee-style hosted endpoint via SITE_RENDER_URL, (b) a Vercel serverless Playwright function, (c) the already-connected Chrome MCP. Which do you rule for prod, given drafts-only + cost?
3. Should we ELIMINATE the lossy extractPageContent→contentToBlocks fallback for "rebuild my existing site" (replace with: if we can't get a faithful DOM, tell the user we need to render it, rather than silently degrade)? Keep extract only for the "analyze for a NET-NEW build" path?
4. Fidelity contract: when capture lacks data-cs, should htmlToSections still emit structure-only (current) or should we mark the page low-fidelity and offer a re-capture?
5. The decision logic: client provides (a) their own site URL, (b) a completed profile/no site, (c) a competitor/not-their site. How should each route through capture→(clone faithfully | generate net-new)? 
Keep constraints: drafts-only, (tenant_id,website_id) scoped, no auto-publish, Gemini-first cost.
