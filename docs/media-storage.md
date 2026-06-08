# Media Storage & Egress Architecture

> Status: implemented (Supabase default; R2 opt-in). Reviewed by Copilot 2026-06-08 — "correct, future-proof, production-grade."

## Why
Supabase Storage "Cached Egress" exceeded the free-tier quota because public media
(uploads, AI images, system assets) in the `website-media` bucket was served as
`<img src>` on tenant sites and reloaded constantly by the editor — with **no cache
headers**, so browsers/CDN re-fetched every time.

The website **importer does not contribute** — imported sites keep the source's
external image URLs (not re-hosted).

## Design
`lib/media/storage.ts` is the single media object-storage abstraction:
`putObject` · `copyObject` · `removeObjects` · `downloadObject` · `publicUrlFor`.

- **Default:** Supabase `website-media` bucket, uploads with `cacheControl: 31536000`
  (1-year immutable) so browsers stop re-fetching.
- **R2 (opt-in):** when the `R2_*` env vars are set, all media goes to **Cloudflare R2
  (zero egress)** instead. Identical behaviour until configured — safe no-op.

All media call sites (uploadMedia, system import, bulk upload, AI images,
promote/copy, deletes) route through the abstraction.

## Permanent addresses (decision)
- **Sites:** `https://<subdomain>.aibizconnect.app` (reserved in `domains`) — permanent.
- **Media:** `https://media.aibizconnect.app/<storage_path>` — a Cloudflare **custom
  domain** attached to the R2 bucket (NOT the throwaway `r2.dev` URL). The address stays
  permanent forever even if buckets/accounts/providers change — we just repoint the domain.

## R2 env
```
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
R2_BUCKET=aibizconnect-media
R2_PUBLIC_BASE=https://media.aibizconnect.app
```

## Migration
`scripts/migrate-media-to-r2.mjs` (idempotent; dry-run by default, `--apply` to execute):
1. Copies every Supabase object → R2.
2. Rewrites image URLs **embedded in content** (Supabase public URL → R2 public URL) across
   `website_pages.draft_sections`, `website_page_sections.content`,
   `website_global_blocks.content/draft_content`, `website_brand_settings.theme`,
   `websites.wizard/seo_defaults`, plus the `website_media.url` rows.

## Cloudflare setup (one-time)
1. R2 → Create bucket `aibizconnect-media`.
2. Bucket → Settings → Public access → Custom Domains → connect `media.aibizconnect.app` (auto DNS+SSL).
3. R2 → Manage API Tokens → create (Object Read & Write, scoped to the bucket); copy Access Key ID, Secret, Account ID.
4. Set the 5 env vars in `.env.local` + Vercel; restart/redeploy.
5. `node scripts/migrate-media-to-r2.mjs` (dry run) → `--apply`.

## Recommended follow-ups (Copilot review — TODO/optional)
- **R2 CORS:** add a CORS policy on the bucket if any media is fetched via `crossorigin`/canvas
  (plain `<img>` doesn't need it).
- **Lifecycle rules:** optional R2 lifecycle (e.g. expire orphaned temp/AI assets) to control storage.
- **Image resizing on upload (`sharp`):** hero ≤1920px, content ≤1200px, thumbnails ≤600px,
  convert to WebP/AVIF — cuts storage + egress + load time. The abstraction makes this a drop-in.
- **Fallback in `publicUrlFor`:** if R2 is unreachable, fall back to the Supabase public URL (or a
  placeholder) so tenant images never break.
- **Monitoring/alerts:** Supabase egress alert, R2 storage alert, audit logs for migration + failed
  R2 uploads, to avoid silent failures.
