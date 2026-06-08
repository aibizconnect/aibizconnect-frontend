Ali — this is an excellent decision record. It captures the problem, root cause, fix, architecture, and migration path cleanly.
Below is the finalized project‑record version, with four additions I strongly recommend for long‑term stability: CORS, lifecycle rules, image resizing, and fallback strategy.

Everything else is solid.

✅ PROJECT RECORD — Media Storage & Supabase Egress Architecture (Final)

(Builder → Copilot: logged for the permanent engineering record)

Problem

Supabase Cached Egress exceeded quota (6.6 / 5 GB, 133%).
Cause: all tenant media (uploads, AI images, system assets) lived in a public Supabase Storage bucket (website-media) and were served via public URLs with no cacheControl.
Browsers + CDN re-fetched assets constantly, especially inside:

tenant websites

the editor

the Media Library

Importer is not the cause — imported sites keep external image URLs.

Fix Shipped

(commits 5980a57, 2c3378a, b2d3ef6)

1. 1‑year immutable cacheControl on all uploads

cacheControl: "31536000" applied to:

uploadMedia

bulk uploads

system imports

AI images

Result: browsers stop re-fetching → massive egress reduction.

2. New unified media abstraction (lib/media/storage.ts)

All media operations now go through:

putObject

copyObject

removeObjects

downloadObject

publicUrlFor

This abstraction routes to:

Cloudflare R2 (zero egress) when configured

Supabase Storage otherwise

All call sites refactored.
Dependency added: aws4fetch (S3-compatible client).

3. Migration script: scripts/migrate-media-to-r2.mjs

Does:

Copies every Supabase object → R2

Rewrites embedded URLs in:

website_pages.draft_sections

website_page_sections.content

website_global_blocks.content/draft_content

website_brand_settings.theme

websites.wizard/seo_defaults

Idempotent.
Dry-run by default; --apply to execute.

R2 Configuration

Environment variables:

R2_ACCOUNT_ID

R2_ACCESS_KEY_ID

R2_SECRET_ACCESS_KEY

R2_BUCKET=aibizconnect-media

R2_PUBLIC_BASE=https://media.aibizconnect.app

Permanent Address Decision (Critical)

All public media will be served from:

https://media.aibizconnect.app/<storage_path>

This is a custom Cloudflare domain attached to the R2 bucket.

Rationale:

URL stays permanent even if:

R2 bucket changes

R2 account changes

provider changes

Only the DNS + Cloudflare binding changes

Same principle as tenant site subdomains (businessname.aibizconnect.app)

This ensures media URLs never break.

Status

Code merged

Awaiting Ali’s Cloudflare setup:

Create R2 bucket

Attach media.aibizconnect.app

Create R2 API token

Add env vars to .env.local + Vercel

Then run migration:

Dry-run

--apply

Media temporarily unlocked for migration; will re-lock after cutover.

⭐ Recommended Additions (Copilot’s review)

These are not required for correctness, but they complete the architecture and prevent future issues.

1. R2 CORS Policy (Required for Editor + Media Library)

Add a CORS rule to R2:

Allowed origins:

https://aibizconnect.app

https://*.aibizconnect.app

http://localhost:3000 (dev)

Allowed methods:

GET, PUT, HEAD, DELETE

Allowed headers:

content-type, authorization, x-amz-acl

Without this, uploads or previews may fail in the editor.

2. R2 Lifecycle Rules (Strongly Recommended)

Add lifecycle rules to reduce storage bloat:

Auto-delete AI-generated images older than X days (optional)

Auto-delete temporary uploads

Auto-delete unused thumbnails

Auto-transition large assets to cheaper storage class (if needed)

This keeps R2 costs predictable.

3. Image Resizing on Upload (Sharp) — Optional but High ROI

Add a sharp pipeline for:

max width 1920px for hero

1200px for content

600px for thumbnails

convert to WebP/AVIF

This reduces:

storage

egress

page load time

Media Library load time

You already have the abstraction layer — adding resizing is trivial now.

4. Fallback Strategy if R2 or media domain is down

Add a fallback in publicUrlFor:

If R2 fails:

fallback to Supabase public URL

OR return a signed URL from R2

OR return a placeholder image

This prevents broken images on tenant sites.

5. Monitoring & Alerts

Add:

Supabase egress alert

R2 storage alert

Media migration audit logs

Error logs for failed R2 uploads

This prevents silent failures.

⭐ Final Verdict

Your architecture is correct, future-proof, and production-grade.
The only additions I recommend for the project record are:

R2 CORS

R2 lifecycle rules

optional image resizing

fallback strategy

monitoring/alerts

Everything else is already excellent.

If you want, I can generate a SETUP.md or ARCHITECTURE.md section for the repo based on this.

Edit in a page