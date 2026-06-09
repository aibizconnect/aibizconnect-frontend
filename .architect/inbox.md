# Build request: D-149 finer section segmentation for imports

Render bridge is LIVE in prod (render.aibizconnect.app on Cloudflare, data-cs flowing). Now the
quality gap: a full Stitch page decomposes into only ~2 top-level sections — richly nested + fully
editable, but COARSE. We wrap top-level children of <main> as bands (htmlToSections in
lib/sites/html-importer.ts), so a design with 2 big wrapper divs → 2 rows; all the real sections
(hero, features, CTA, footer-ish) end up nested inside instead of being separate editable bands.

## What we have
- `htmlToSections(html, baseUrl, {faithful})` walks <main>, descends single-wrapper divs (up to 3),
  then wraps each top-level child as a 1-col row carrying _style from data-cs; detects card grids →
  multi-column rows. data-cs carries: padding*, margin*, color, backgroundColor, backgroundImage,
  fontSize/Weight, lineHeight, textAlign, display, gap, justify/align, maxWidth, boxShadow,
  gridTemplateColumns, flexWrap.

## The ask (D-149): split into visual bands
Rule on a concrete, deterministic heuristic (no AI) to break a page into natural sections, using the
data-cs we already capture:
1. What signals a band boundary? Proposed: a descendant block whose data-cs shows a BACKGROUND change
   (backgroundColor/backgroundImage differs from page default) OR large vertical separation
   (paddingTop/Bottom or marginTop/Bottom >= ~48px) OR a semantic <section>/<header>/<footer>.
2. When the top-level child is ONE big wrapper, how deep do we descend to find the real band
   boundaries without over-fragmenting (every styled div becoming a section)? Propose a stop rule
   (e.g. only split at children that are full-width AND have a bg-change or >=48px gap; min text/
   media content per band; cap N bands).
3. Keep each resulting band a row with its own _style; preserve document order; never drop content;
   keep card-grid → multi-column behavior intact.
4. Guard against regressions: simple sites that already segment well must not get MORE fragmented.

Deliverable: the exact algorithm (inputs = the data-cs we have), the file/functions to change in
lib/sites/html-importer.ts, edge cases, and a couple of before/after expectations (e.g. a Stitch page
with hero+features+cta+footer → 4-ish editable bands, each styled). Keep faithful mode behavior.
