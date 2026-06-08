Builder → Copilot. DOCUMENTATION / decision record (not a question). Please log this for the project record and flag anything you'd add.

# Media storage & Supabase egress — resolution + permanent architecture

## Problem
Supabase "Cached Egress" went over the free-tier quota (6.6 / 5 GB, 133%). Root cause: media (user uploads, AI-generated images, system background assets) lives in a PUBLIC Supabase Storage bucket `website-media`, served via getPublicUrl public URLs embedded as <img src> on tenant sites + reloaded constantly by the editor/Media Library. Uploads had NO cacheControl, so browsers/CDN re-fetched every time. (Note: the website IMPORTER does not add to this — imported sites keep external image URLs, not re-hosted.)

## Fix shipped (commits 5980a57, 2c3378a, b2d3ef6)
1. Immediate: 1-year immutable `cacheControl: "31536000"` on every upload path (uploadMedia, bulk, system import, AI images). Browsers stop re-fetching → big egress cut. Safe, live now.
2. Permanent: new `lib/media/storage.ts` abstraction — putObject / copyObject / removeObjects / downloadObject / publicUrlFor — that routes media to Cloudflare R2 (ZERO egress) when configured, else Supabase. ALL media call sites refactored through it. Identical behaviour until R2 env is set (safe no-op otherwise). Dep added: aws4fetch (tiny S3-compatible client).
3. Migration: scripts/migrate-media-to-r2.mjs — (a) copies every Supabase object to R2, (b) rewrites image URLs EMBEDDED in page/block/brand content (website_pages.draft_sections, website_page_sections.content, website_global_blocks.content/draft_content, website_brand_settings.theme, websites.wizard/seo_defaults) from the Supabase public URL → R2 public URL. Idempotent; dry-run by default, `--apply` to execute.

## R2 config (env)
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET=aibizconnect-media,
R2_PUBLIC_BASE=https://media.aibizconnect.app

## Permanent-address decision (IMPORTANT)
All public media will be served at **https://media.aibizconnect.app/<storage_path>** — a Cloudflare custom domain attached to the R2 bucket (NOT the throwaway r2.dev URL). Rationale: the address stays permanent forever even if we change R2 buckets/accounts/providers — we just repoint the domain. Same stability principle as the tenant site subdomain (businessname.aibizconnect.app, reserved in the `domains` table, permanent unless changed). So going forward: site addresses AND media addresses are permanent.

## Status
Code merged. Awaiting Ali's Cloudflare setup (create bucket, attach media.aibizconnect.app custom domain, R2 API token, set 5 env vars in .env.local + Vercel). Then: dry-run → --apply migration. Media is temporarily UNLOCKED for this work; will re-lock after cutover.

Anything you'd add to the doc — e.g. R2 CORS, lifecycle rules, image resizing on upload (sharp), or a fallback if media.aibizconnect.app is ever down?
