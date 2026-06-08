Builder → Copilot. Seeking your view on the HIGH-FIDELITY website importer (we render the source site in a real browser, then rebuild it as an editable layer tree). The architect already ruled "Hybrid (C)"; I want your independent read before I build the next phase.

WHAT'S DONE (committed, verified on aibizconnect.app — a Lovable/React SPA, Tailwind):
- Render bridge (Playwright) paints the page; SPA shells now import.
- Header → ONE shared global Header block (logo + hierarchical menu WITH submenus + CTAs); Footer → ONE shared global Footer (brand+social, link columns, contact, ©). 1 header + 1 footer shared across all pages (verified: 11 pages → 2 global blocks).
- Hero detected as a real hero section; body → ordered editable sections (heading/text/image/gallery/button/list/form/video).
- Fonts → theme; per-page SEO (title/desc/canonical/og/JSON-LD) → draft_seo.
- NEW fidelity: bridge annotates each element with a whitelist of getComputedStyle (padding/margin/bg/radius/color/fontSize/align/gap/justify/align-items/maxWidth) as data-cs; importer maps that into our ElementStyle (content._style: pt/pr/pb/pl, mt.., bg, radius, align) + typed fontSize/color. Renderer already applies content._style universally (SectionView wrapper), so leaf elements + header/footer/hero now carry their real spacing/colors. Imported :root CSS vars + @font-face → site-wide custom CSS (theme.site.siteCustomCss, 256KB cap), injected on the public page.

KNOWN GAP (the next phase, want your guidance):
The body importer still FLATTENS section containers — it walks the DOM and emits leaf blocks in order, so the big SECTION-level vertical padding and full-width band background colors aren't reproduced as their own wrappers. Leaf elements carry their own padding now, but a "section" as a styled full-width band (e.g. a colored CTA strip with 96px top/bottom padding and a max-width inner container) isn't emitted as a row/section.

QUESTIONS:
1. CONTAINER-STRUCTURE PASS: Best way to rebuild section structure faithfully AND editable? Options: (a) detect each top-level <section>/full-width flex/grid band → emit a `row` (1 col) carrying the band's _style (padding/bg/maxWidth via contentWidth), with its inner content as children; recurse for inner flex/grid → multi-column rows with colStyles. (b) only wrap when the container has a non-trivial background or large padding (avoid over-nesting). (c) something else. How deep should we recurse before it becomes noise/over-nested for an editor user?
2. WIDTH/CENTERING: source uses an outer full-width band + inner max-width container (Tailwind `container mx-auto`). Map outer→row(contentWidth:full,_style.bg/padding), inner→row(contentWidth:boxed)? Or detect max-width and set the row's boxed width?
3. COLORS for Tailwind: real brand colors live in CSS vars as HSL triplets (e.g. `--primary: 222 47% 11%`). Worth parsing those into the theme palette (hsl→hex), or rely on captured per-element computed colors only?
4. IDEMPOTENCY on re-import: don't clobber tenant edits to _style. Flag system-set styles vs user-set? Or only apply on first import?
5. Any risks you foresee with emitting many nested rows (performance, editor UX, publish-time sectionSchema)?

Give me your decisive recommendation. Architect said: Hybrid, computed-style whitelist, websites.custom_css store, don't overwrite tenant edits, detect flex/grid → row+colStyles. I'm synthesizing both views.
