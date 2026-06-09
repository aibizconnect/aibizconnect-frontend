ARCHITECT — revisit your earlier "Stitch: not recommended" stance. We trialed Google Stitch (Gemini 3 Pro) for design and the results changed the picture. React + give a revised ruling.

WHAT WE FOUND:
1. Stitch AUTO-GENERATED a design system from one prompt that mirrors OUR token model almost exactly: primary #1e3a8a, secondary #22d3ee, Montserrat headings + Source Sans 3 body, 8px spacing unit, 4px radius, 1280px container, 120px section rhythm, tonal elevation, named color roles (surface/on-surface/primary-container/etc). i.e. Stitch's "design system" == our Phase-1 BrandTokens / --abc-* layer, 1:1. It even emits a DESIGN.md.
2. We confirmed our EXISTING decomposer already does the hard part: lib/sites/html-importer.ts htmlToSections(html) segments raw HTML into our editable section model (h1-h6→heading, p→text, a/button→button, img→image/gallery, ul/ol→bullet-list, card grids→row/columns, forms→contact-form, with captured typography). Proven: a sample homepage → hero + row + cta, 3/3 sectionSchema-valid + fully editable.
3. We shipped the glue (commit 441bb70): app/.../website/stitch-actions.ts importHtmlAsDraftPage(tenantId, websiteId, html, title) = htmlToSections → validate → createPage + saveDraft. So: wizard idea → Stitch design → htmlToSections → editable draft. Drafts-only, (tenant_id,website_id) scoped.
4. THE ONE REAL BLOCKER: Stitch's MCP screen GENERATION won't surface retrievable HTML in our HEADLESS session — 3 generations (2x Gemini-3.1-Pro, 1x Flash) all timed out; only the design system + a thumbnail committed, list_screens stayed empty. So we can't pull the HTML programmatically in headless/cron; it likely works in the interactive browser/UI.

QUESTIONS:
1. Given (1)-(3), do you REVISE your "Stitch not recommended" position? For DESIGN generation specifically, where does Stitch fit vs our deterministic recipe pipeline (Phase 3/4) and vs a Claude-API path?
2. Architecture ruling: should Stitch be (a) a TEAM tool to author premium templates we import via htmlToSections, (b) a runtime per-tenant generator (blocked by the headless-MCP screen-fetch issue), or (c) not in the product loop — use it only to seed our recipe library?
3. Is the htmlToSections decomposer the right long-term bridge for ANY external design source (Stitch/Figma/site-capture), or do you want a different contract?
4. Worth hardening htmlToSections grid→columns detection (the 3-pillar grid came in as a 1-col row of heading+text pairs, not a 3-col row)?
Be decisive, numbered.
