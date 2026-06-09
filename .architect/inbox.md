# Brief: host our agents + render bridge in prod → fully autonomous website pipeline

Ali's goal: "our agents live on a host and EVERYTHING is autonomous." Today the autonomous
build/import pipeline only reaches true fidelity locally because the render bridge
(`scripts/render-server.mjs`, a Playwright headless browser) runs on Ali's machine. We need a
production architecture where the pipeline runs server-side with NO manual steps.

## Current state (what exists)
- App: Next.js (App Router) on Vercel, Supabase + external backend, R2 media.
- Build pipeline: `wizard-actions.generateWizardPages` → clone/AI/Stitch → editable draft pages.
- Stitch path (autonomous, via Stitch MCP): create design system → generate screens →
  `importStitchScreen` → render bridge resolves Tailwind → `htmlToSections` → image ingestion.
- Render bridge: `scripts/render-server.mjs` exposes `GET /render?url=` and `POST /render-html`,
  annotates every element with computed styles (`data-cs`) + harvests @font-face/:root/keyframes.
  Gated by `SITE_RENDER_URL`. NOT deployed in prod → prod imports are low-fidelity.
- MCPs (Stitch, etc.) are available inside the Claude/agent session, NOT to the Vercel runtime.

## The two hard questions
1. **Render bridge hosting.** Vercel serverless can't run a persistent Playwright Chromium. Options:
   (a) Browserless.io / ScrapingBee (managed headless) — point `SITE_RENDER_URL` at it, but our
   `data-cs` annotation + CDN-Tailwind settle logic is custom — can we run our annotation script via
   their `/function` or BrowserQL, or do we self-host? (b) Self-host `render-server.mjs` as a small
   always-on container (Fly.io / Render.com / Railway / a cheap VPS) — cheapest control, we own the
   annotation. (c) Cloud Run / a serverless container with playwright. Rank these for cost + fidelity
   + ops, and pick a default.
2. **Autonomous agent execution in prod.** Today the orchestration (call Stitch MCP, decide pages,
   import) happens in an interactive Claude session. To be autonomous server-side we need a headless
   agent runner. Options: (a) Claude Agent SDK running on the same host as the render bridge, driven
   by a queue/cron, with the Stitch + our-app tools available headlessly. (b) Move the Stitch calls
   server-side via Stitch's REST API (do we need our own Google/Stitch API credentials in the
   backend rather than the MCP?) so the Next backend can run the whole pipeline without an agent.
   (c) A hybrid: a worker service that wraps both. Which is the right production shape, and what are
   the credential/secrets implications (Stitch API key, Supabase service role, R2)?

## Constraints
- Don't break the Vercel app; the render bridge + agent runner should be SEPARATE services the app
  calls via env-configured URLs (so local dev still works unchanged).
- Secrets stay server-side; no secret values in client or URLs.
- Drafts-only, tenant-scoped, durable images — all existing guarantees must hold.
- Prefer the simplest thing that is genuinely autonomous and affordable at small scale, with a clear
  upgrade path.

## Deliverable
A concrete, ranked, phased production architecture: (1) where the render bridge runs and how
`SITE_RENDER_URL` is wired; (2) how the autonomous build agent runs headless and triggers
(queue/cron/webhook on tenant signup or "build my site"); (3) the credentials/secrets list and where
each lives; (4) a minimal first deployment we can stand up now, and the upgrade path. Name the files/
services to add. Assume the pipeline above.
