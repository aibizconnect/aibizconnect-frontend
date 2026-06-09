---
name: stitch-import
description: >
  Import a Google Stitch design DIRECTLY into a tenant's website as a clean, fully-editable,
  true-to-design page — no copy/paste. Use when the user says "import from Stitch", "bring my
  Stitch screen into the builder", "rebuild this Stitch design", or picks a Stitch screen to turn
  into a page. Resolves Stitch's Tailwind classes to real computed styles via the render bridge,
  ingests every image into the tenant Media Library, and lands editable sections (not a locked
  HTML blob).
---

# Stitch → editable page (true-to-design import)

Turn a Stitch screen into an editable AIBizConnect page that visually matches the design.

## Why this skill exists (the key fact)
Stitch exports **Tailwind utility classes + the Tailwind CDN** (`<script src="cdn.tailwindcss.com">`),
NOT spelled-out CSS. `class="bg-electric-violet px-margin-desktop"` is meaningless until a browser
runs Tailwind. So a faithful import MUST render the HTML in a real browser to resolve those classes
into computed styles (annotated as `data-cs`). That browser is the **render bridge**.

## When to use
- "Import my Stitch screen / project into the site."
- "Rebuild this Stitch design as an editable page."
- After generating/editing a screen in Stitch, to land it in a tenant's website.

## Prerequisite: the render bridge must be reachable
Fidelity depends on `SITE_RENDER_URL` pointing at a running render bridge.
- **Local:** `node scripts/render-server.mjs`, then set `SITE_RENDER_URL=http://localhost:8787`.
- **Prod:** a hosted headless-browser endpoint mirroring `scripts/render-server.mjs`
  (exposes `GET /render?url=` and `POST /render-html`).
If no bridge is configured, the import still succeeds but is flagged **low-fidelity** (structure
without resolved styling) — tell the user to start the bridge and re-import for a true copy.

## How to run it (the flow)
1. **Find the screen** via the Stitch MCP:
   - `mcp__stitch__list_projects` → pick the project.
   - `mcp__stitch__list_screens` (or `get_project`) → pick the screen.
   - `mcp__stitch__get_screen` → read `htmlCode.downloadUrl` (a Google usercontent HTML link).
2. **Import it** with the server action — pass the URL straight through (no download/paste):
   - `importStitchScreen(tenantId, websiteId, htmlCode.downloadUrl, title, { isHome? })`
     in `app/tenants/[tenantId]/website/stitch-actions.ts`.
   - It fetches the HTML → `importHtmlAsDraftPage` → render bridge (Tailwind → `data-cs`) →
     `htmlToSections({ faithful: true })` → ingests images into the tenant Media Library →
     creates a DRAFT page.
3. **Report the result** to the user from the returned `ImportHtmlResult`:
   - `sectionCount`, `imagesIngested`, and **`fidelity`** ("high" = true-to-design;
     "low" = no styles resolved → advise starting the render bridge and re-importing).

If you only have raw pasted HTML (not a Stitch MCP screen), use `importHtmlAsDraftPage(tenantId,
websiteId, html, title)` directly — same pipeline, same fidelity behavior.

## Hard rules
- **Editable, never a blob.** Output is segmented sections (heading/text/image/button/row/…),
  each editable. Never import a raw `<iframe srcdoc>`/HTML-blob as the page body.
- **Drafts only.** Always lands as a draft page; the user reviews before publishing.
- **Assets must be durable.** Images are ingested into the tenant Media Library on import
  (no rotting hotlinks). Don't disable that pass.
- **Ownership.** Imported-from-Stitch images are the tenant's (they directed the design) → tenant
  Media Library. Only platform-AI-generated images go to the SYSTEM library.
- **No secrets / no PII.** Fetch the Stitch URL server-side; only Google usercontent hosts are accepted.
- **Honesty on fidelity.** If `fidelity === "low"`, say so plainly and give the fix (render bridge).

## Output format
```
## Stitch import: <title>
- Source: project <name> · screen <title>
- Result: <sectionCount> editable sections · <imagesIngested ? "images ingested to Media Library" : "no images">
- Fidelity: <high (true-to-design) | low — render bridge not running, re-import after starting it>
- Page: draft "<slug>" (review, then publish)
Next: <single most useful action — e.g. open the editor, or start the render bridge>
```
