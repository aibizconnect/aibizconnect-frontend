# Decision request: host the render bridge on Cloudflare (reuse existing account)

Ali wants ONE place, not a new host. We already use Cloudflare (R2 for all media:
R2_ACCOUNT_ID/R2_BUCKET/R2_PUBLIC_BASE). App is on Vercel. You earlier ruled self-host on
Fly.io (D-158) — Ali prefers Cloudflare to consolidate. Please re-evaluate and rule.

## The need (unchanged)
A service that loads a URL or RAW HTML in headless Chromium and returns the DOM annotated with
per-element computed styles (data-cs) + harvested @font-face/:root/keyframes. This is our custom
in-page annotation (page.evaluate over a KEEP whitelist), NOT a screenshot/scrape — see
scripts/render-server.mjs (`/render?url=`, `POST /render-html`). Stitch exports are Tailwind-CDN
classes that only resolve in a real browser, so fidelity REQUIRES this.

## Cloudflare option to evaluate
**Cloudflare Browser Rendering** via a Worker with a `browser` binding using `@cloudflare/puppeteer`:
- Worker exposes the same two endpoints; inside, `puppeteer.launch(env.MYBROWSER)` → `page.goto` or
  `page.setContent` → run our SAME annotation `page.evaluate(...)` → return `page.content()`.
- Reuses the existing Cloudflare account (same place as R2). Token-guard via a Worker secret.
- Concerns to rule on:
  1. Does Browser Rendering support `page.evaluate` with our custom annotation + reading
     `document.styleSheets` for @font-face/:root/keyframes? (vs the limited REST endpoints
     /screenshot /content /scrape which can't run our annotation.)
  2. Tailwind CDN `<script src=cdn.tailwindcss.com>` must EXECUTE inside the render (JS enabled) for
     setContent of Stitch HTML — is that allowed/automatic in Browser Rendering?
  3. Limits: Browser Rendering session caps/concurrency, CPU time per request, free-tier vs paid,
     cold start. Good enough for on-demand site/Stitch imports at small scale?
  4. Worker request body size for POST /render-html (Stitch docs ~20–200KB, but captured pages can
     be larger). Any cap we must chunk around?
- If a hard blocker exists, is **Cloudflare Containers** (newer, runs a real container = our exact
  render-server.mjs Dockerfile, already written) the better Cloudflare-native path? Compare Workers-
  Browser-Rendering vs Cloudflare-Containers for THIS workload (custom in-page annotation, JS exec,
  always-similar logic) on fidelity, limits, cost, ops.

## Deliverable
Rule: Cloudflare Browser Rendering Worker vs Cloudflare Containers vs keep Fly fallback. Pick the
default, name the files to add (e.g. `deploy/render-bridge-cf/` worker + wrangler.toml), the bindings/
secrets, and how the Vercel app wires SITE_RENDER_URL/SITE_RENDER_TOKEN to it. Keep our existing
render-server.mjs as the source of the annotation logic so local dev is unchanged. Note any fidelity
caveat vs the self-hosted container so we degrade honestly.
