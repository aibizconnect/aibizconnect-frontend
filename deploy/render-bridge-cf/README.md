# Render bridge — Cloudflare Worker (production)

Headless-Chromium service that turns a URL or raw HTML into a DOM annotated with per-element
**computed styles** (`data-cs`) — what makes Stitch/site imports land **true-to-design and editable**.
Runs on **Cloudflare Browser Rendering** under the **aibizconnect.app** zone, same account as R2
(one place). Architect D-162/D-163.

Same HTTP contract as `scripts/render-server.mjs`, so the Vercel app is unchanged — only env vars.

## Endpoints
- `GET  /healthz` — liveness (open).
- `GET  /render?url=<page>` — render a live URL.
- `POST /render-html` — render raw HTML in the body (Stitch/Figma exports).
- Auth: `Authorization: Bearer <RENDER_TOKEN>` (or `?token=`). `/healthz` open.

## Prerequisites
- **Cloudflare Workers Paid plan** (Browser Rendering is not on the free tier).
- `aibizconnect.app` active in this Cloudflare account (it is — R2 lives here).

## Deploy
```bash
cd deploy/render-bridge-cf
npm install
npx wrangler login                       # one-time, opens browser to the Cloudflare account
npx wrangler secret put RENDER_TOKEN     # paste a long random string; reuse it in Vercel
npx wrangler deploy                      # creates the Worker + render.aibizconnect.app custom domain
```

## Wire the app (Vercel env)
```
SITE_RENDER_URL   = https://render.aibizconnect.app
SITE_RENDER_TOKEN = <the RENDER_TOKEN you set>
```
Redeploy the app → every capture/import resolves styles in a real browser → high fidelity,
autonomously, no manual steps.

## Limits / honest caveats (architect)
- **1 MB request body** on `POST /render-html` — Stitch exports (~20–200 KB) fine; a giant captured
  page could exceed it (then stash in R2 + pass a URL). The app caps + flags low-fidelity on error.
- **Worker CPU time** — extremely heavy pages can time out (30s nav cap); on error the app degrades
  honestly to low-fidelity (D-144).
- If either limit ever bites in practice, the Cloudflare-native upgrade is **Cloudflare Containers**
  (runs the exact `deploy/render-bridge/Dockerfile` — same zone, no new vendor).

## Local dev is unchanged
Keep using `node scripts/render-server.mjs` + `SITE_RENDER_URL=http://localhost:8787` locally.
This Worker is the production deployment of the same logic (annotation kept in sync in `src/annotate.ts`).
