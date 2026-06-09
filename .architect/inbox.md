# Brief: Religious HTML import → faithful, editable rebuild for tenants

## Goal
Import HTML from any source (a live website, a Stitch/Figma export, pasted markup) and rebuild
it INSIDE our block editor so faithfully that it visually matches the source, yet every element
remains an editable primitive in our section model. The tenant then customizes it.

## Current pipeline (what exists today)
- Capture: `lib/sites/site-clone.ts fetchPage()` — static fetch; if `SITE_RENDER_URL` is set, it
  renders via a headless bridge that injects per-element computed styles as `data-cs` attrs and
  prefers that DOM (D-141). Prod has no renderer yet (D-142 pending).
- Decompose: `lib/sites/html-importer.ts htmlToSections(html, baseUrl, {faithful})` — walks BODY in
  document order, maps tags → our blocks (heading/text/image/gallery/bullet-list/button/contact-form/
  video/divider/html-fallback), wraps each top-level band in a 1-col `row` carrying `_style` from
  `data-cs` (bg + padding), detects card grids → multi-column rows. `faithful:true` skips the
  opinionated composite `hero`.
- Style capture: `lib/sites/style-capture.ts` applies `data-cs` → block typography/style.
- Glue: `stitch-actions.ts importHtmlAsDraftPage` (paste→page) and `wizard-actions.ts
  cloneSectionsFromHtml` (site rebuild, faithful, no lossy fallback).

## Known fidelity gaps I want your ruling on
1. **Styling lost without a renderer.** `data-cs` only exists when `SITE_RENDER_URL` is set. Raw
   paste from Stitch/Figma has inline classes (Tailwind/utility) but NO computed styles. Right now
   pasted HTML imports as nearly unstyled primitives. How should we extract style from raw HTML
   that has only `class=` + `<style>`/`<link>` (no data-cs)? Options: (a) parse linked/inline CSS
   and resolve per-element computed style ourselves in-process; (b) a tiny Tailwind-class→token
   mapper; (c) require the render bridge for everything. Rank these.
2. **Section/band segmentation.** We wrap top-level children of `main` as bands. Deeply nested
   single-wrapper layouts and full-bleed/overlap heroes get flattened. What's the right band
   detection heuristic (visual grouping by background change? by spacing? by semantic landmarks)?
3. **Two-way fidelity check.** Should we render our rebuilt sections back to HTML and visually diff
   (pixel/DOM) against the source to score fidelity and flag low-fidelity pages (D-144)? If so,
   cheapest reliable approach.
4. **Asset durability.** Imported `<img>`/background URLs point at the source origin and rot. Rule:
   ingest every imported image into the tenant Media Library on import (we have
   `lib/media/ingest.ts ingestExternalImage` + `lib/sites/image-ingestion.ts`). Confirm + sequencing.
5. **Style fidelity vs editability tradeoff.** We must NOT paste raw HTML blobs (locks editing) but
   also must preserve look. Where's the line — which CSS properties do we promote to our block
   `_style`/token system, and which do we drop?

## Deliverable I want back
A concrete, ranked, phased plan (P1..Pn) for a "religious import" that (a) maximizes visual
fidelity, (b) keeps every element editable, (c) degrades gracefully + flags low-fidelity, (d) makes
assets durable. Name the files to change. Keep it actionable; assume the existing pipeline above.
