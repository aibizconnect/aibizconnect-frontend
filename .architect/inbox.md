# Consult: parallel SEO/GEO analysis folded into the website build

## Context — where the website importer stands now
We import an existing site into the editor as an editable **layer tree** (page → sections → elements), routing each layer to its home:
- **Header** → shared **Global Header** block (row: logo image + nav menu + CTA button).
- **Footer** → shared **Global Footer** block (row of columns: brand+social, link menus, contact, ©).
- **Hero** → a real `hero` section (heading/subheading/CTAs/background), detected + removed so the body walk doesn't duplicate it.
- **Body** → ordered editable sections via `htmlToSections` (headings/text/image/gallery/button/list/form/video/html).
- **Fonts + colors** → `extractTheme` writes `website_brand_settings.theme` (Google-Fonts/CSS font-family; colors from CSS vars/theme-color/dominant hue).
- **Per-page SEO/GEO** → `extractSeo` pulls real `<title>`, meta description, canonical, og:image, JSON-LD @type(s) into `draft_seo` (overriding synthetic geoSeoForPage).
- **SPA render bridge** (`scripts/render-server.mjs` + `SITE_RENDER_URL` hook in `fetchPage`): JS-rendered sites (e.g. aibizconnect.app is a Lovable/React SPA) are rendered in a real browser first, else we only get an empty `<div id=root>` shell. Verified end-to-end.

We also already have a standalone **SEO + GEO analyzer** (`public/tools/seo-geo-analyzer.html`, now LOCKED) that scores a URL on SEO + AI/answer-engine (GEO) readiness via PageSpeed Insights + robots/llms/schema checks and emits a prioritized task list (noindex, missing schema/JSON-LD, H1 hierarchy, meta description, AggregateRating, llms.txt, Cloudflare AI-bot blocking, freshness/dateModified, etc.).

## Proposal (Ali's request)
Run the **SEO/GEO analysis in parallel with the import/build**, and **auto-apply the safe findings into the generated draft** (drafts only, never publish). e.g. during build:
- ensure exactly one H1 per page (map the hero heading to H1, demote stray H1s→H2);
- generate + inject JSON-LD (Organization/LocalBusiness/FAQPage/Article) into `draft_seo.schemas` from the extracted business facts;
- fill missing meta titles/descriptions (already partly done);
- add `dateModified`/freshness;
- propose `llms.txt` + robots/AI-bot allowances as a checklist item;
- flag (not auto-fix) infra issues (Cloudflare bot-fight, noindex) as tasks shown to the tenant.

## Questions for you
1. **Auto-apply vs suggest split** — which findings are safe to write into the DRAFT automatically (idempotent, fact-safe, no hallucinated specifics) vs which must be surfaced as a per-page task list the tenant approves? (Anti-hallucination precedent D-059/D-060.)
2. **Integration point** — fold the analysis into `generateWizardPages` (per page, using the same rendered HTML we already fetched, so no extra network), or a separate post-build `auditAndEnhance(websiteId)` pass? Trade-offs?
3. **Data model** — store findings where? Reuse `draft_seo` for applied schema/meta, plus a new `website_pages.seo_audit` JSONB (or a `website_seo_findings` table) for the open task list + scores?
4. **GEO specifics** — given our analyzer already encodes the GEO ruleset, should the build emit `llms.txt`, FAQPage schema, and AggregateRating scaffolds by default for every tenant, or gate behind consent?
5. Any **gotchas** (PSI rate limits, doing this without an API key, schema validity, not overwriting tenant edits on re-run).

Please reply with a recommended design + a short checklist of auto-apply items vs suggest-only items, and any new Supervisor checks (SEO-V*/GEO-V*) you'd define.
