# Render bridge (production)

A tiny always-on service that loads a URL or raw HTML in headless Chromium and returns the DOM
annotated with per-element **computed styles** (`data-cs`) — the thing that makes Stitch/site imports
land **true-to-design and editable**. (Architect D-158.)

It is the exact `scripts/render-server.mjs` from the app repo, containerized. Separate service; the
Next app calls it via `SITE_RENDER_URL`. Local dev is unchanged (run `node scripts/render-server.mjs`).

## Endpoints
- `GET  /healthz` — liveness (open, no token).
- `GET  /render?url=<page>` — render a live URL.
- `POST /render-html` — render raw HTML in the request body (Stitch/Figma exports).
- Auth: if `RENDER_TOKEN` is set, send `Authorization: Bearer <token>` (or `?token=`). `/healthz` is open.

## Deploy to Fly.io (default)
```bash
cd deploy/render-bridge
fly launch --no-deploy                 # pick app name + region (yyz = Toronto)
fly secrets set RENDER_TOKEN=$(openssl rand -hex 24)
fly deploy --dockerfile Dockerfile --build-context ../..   # build context = repo root (needs scripts/)
```
Note: the Dockerfile copies `scripts/render-server.mjs` from the repo root, so build from `../..`.

## Wire the app (Vercel)
Set both env vars to the deployed service:
```
SITE_RENDER_URL   = https://<your-app>.fly.dev
SITE_RENDER_TOKEN = <the RENDER_TOKEN you set above>
```
Redeploy the app. From then on, every capture/import resolves styles in a real browser → high
fidelity, autonomously, with no manual steps.

## Cost
`auto_stop_machines = suspend` + `min_machines_running = 0` → scales to zero when idle (pennies),
wakes on the first request (~1–2s cold start). Bump VM memory to 2gb if large pages OOM.

## Alternatives
Render.com / Railway work the same way (Docker + a public URL + the two env vars). Managed headless
(Browserless/ScrapingBee) was rejected (D-158) because our custom `data-cs` annotation must run
in-page; self-hosting keeps full control of fidelity.
