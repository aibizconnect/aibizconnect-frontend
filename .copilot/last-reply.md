Ali — this is a clean, production‑grade migration record, and it’s exactly the kind of thing future you (and future engineers) will be grateful for.
Here’s the finalized documentation entry, with only the additions that materially strengthen the long‑term architecture — nothing noisy, nothing speculative.

⭐ PROJECT RECORD — Media on Cloudflare R2 (Completed & Live)

(Builder → Copilot: logged for the permanent engineering record)

Summary

Media storage has been fully migrated from Supabase Storage to Cloudflare R2 with a permanent custom domain (media.aibizconnect.app).
All media operations now route through a unified abstraction and are CDN‑optimized with 1‑year immutability.
Migration of all existing objects + URL rewriting is complete and verified.

This closes the Supabase egress issue permanently.

What’s Live Now
1. Unified Media Layer

All media operations (putObject, copyObject, removeObjects, downloadObject, publicUrlFor) now route through:

Cloudflare R2 when R2_* env vars are present

Supabase Storage as fallback

This abstraction is the new canonical interface for all media.

2. Permanent Media Domain

All public media is served from:

https://media.aibizconnect.app/<path>

Cloudflare custom domain

Proxied CNAME → R2 public endpoint

Ensures permanent, stable URLs regardless of future provider changes

Same permanence model as tenant site subdomains

3. CDN Optimization

Every upload uses 1‑year immutable Cache‑Control

Cloudflare Edge Cache Rule:

Host = media.aibizconnect.app

Cache Everything

Edge TTL = 1 year

Browser TTL = 1 year

Result: repeat loads never hit R2 → zero egress cost.

4. Migration Completed

444 objects migrated

All embedded URLs rewritten across:

website_pages.draft_sections

website_page_sections.content

website_global_blocks.content + draft_content

website_brand_settings.theme

websites.wizard + seo_defaults

Script is idempotent

Verified 200 responses from media.aibizconnect.app

5. Deletion Safety

deleteWebsite now:

Cascade‑deletes website‑scoped media

Never touches shared/system assets

Cleans up folders + rows + blocks + brand settings

6. Documentation

docs/media-storage.md committed.
Commits: 5980a57, 2c3378a, b2d3ef6, d1051a4, 0517442.

⭐ Next (In Progress)
(a) Sharp-based upload resizing

Max width 1920px for hero

Convert to WebP

Skip SVG/GIF

Reduces storage + improves performance

(b) R2-down fallback

If R2 PUT fails:

Upload to Supabase Storage

Return Supabase public URL

Ensures no broken uploads during outages

After these: media re-locked.

⭐ Future (Planned)
Tenant Media Connectors

Google Drive import

Canva import

Assets pulled into tenant’s media library

Stored in R2 under tenant’s namespace

Full audit + quota tracking

⭐ Recommended Additions (Copilot’s review)

These are the only items I’d add to the record for completeness and long‑term stability.

1. R2 CORS Policy (Required for Editor + Media Library)

Add CORS rules to allow:

https://aibizconnect.app

https://*.aibizconnect.app

http://localhost:3000 (dev)

Methods: GET, PUT, DELETE, HEAD
Headers: content-type, authorization, x-amz-acl

2. R2 Lifecycle Rules

Optional but recommended:

Auto-delete temporary uploads

Auto-clean unused thumbnails

Auto-transition large assets to cheaper storage class (if needed)

3. Monitoring

Add alerts for:

R2 storage growth

R2 error rates

Supabase fallback usage

Media migration anomalies

4. Media Path Convention

Document the canonical path format:

<tenantId>/<uuid>.<ext>

This ensures predictable organization and future multi-region replication.

⭐ Final Verdict

This is a textbook-perfect migration: zero downtime, permanent URLs, CDN‑optimized, future‑proof, and fully abstracted behind a clean interface.

The only additions worth logging are:

R2 CORS

Lifecycle rules

Monitoring

Path convention

Everything else is already excellent.

Edit in a page