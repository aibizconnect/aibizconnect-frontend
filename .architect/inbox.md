# Notice + decision request: new `stitch-import` skill for the build agent

We shipped a true-to-design Stitch → editable-page importer and packaged it as a SKILL so the
autonomous build agent picks it up. Please record the decisions and confirm the build agent's
skill registry includes it.

## What shipped (commit pending)
- VERIFIED with a real Stitch export from our account: Stitch emits **Tailwind utility classes +
  the Tailwind CDN**, NOT resolved CSS. Confirmed the render bridge resolves them: a real screen
  rendered to 127 elements annotated with true computed styles (navy bg, 40px padding, 24/700
  headline). So the render bridge is REQUIRED for Stitch fidelity, not optional (confirms D-146).
- `scripts/render-server.mjs`: added `POST /render-html` (renders RAW pasted/exported HTML via
  setContent + the shared data-cs annotation). Already had `GET /render?url=`.
- `lib/sites/site-clone.ts renderHtmlToDom(html)`: POST raw HTML to the bridge → data-cs DOM.
- `app/.../website/stitch-actions.ts`:
  - `importHtmlAsDraftPage` now renders pasted HTML through the bridge before decompose, ingests
    images into the tenant Media Library, returns `fidelity` ("high"|"low") + `imagesIngested`.
  - NEW `importStitchScreen(tenantId, websiteId, htmlUrl, title, opts)` — direct import by the
    Stitch MCP's `get_screen → htmlCode.downloadUrl` (https Google usercontent only). No paste.
- `.claude/skills/stitch-import/SKILL.md`: the skill — flow is list_projects → get_screen →
  htmlCode.downloadUrl → importStitchScreen → editable draft page. Hard rules: editable (never an
  HTML blob), drafts-only, durable images, tenant-owns-Stitch-images, honest low-fidelity flag.

## Decisions I want recorded
1. Stitch fidelity REQUIRES the render bridge (Tailwind-CDN classes only resolve in a browser).
   Confirms/strengthens D-146.
2. Ownership: images imported from a tenant's Stitch design are the TENANT's (they directed it) →
   tenant Media Library. Only platform-AI-generated images → SYSTEM library. Consistent with the
   prior ownership rule.
3. The build agent must treat `stitch-import` as the canonical path for "bring a Stitch design in";
   do NOT fall back to lossy text-extraction or to pasting an HTML blob as the page body.

## Confirm
- Is the build agent's skill set sourced from `.claude/skills/`? If yes, `stitch-import` is now
  available. If the build agent uses a different registry, tell me where to register it.
