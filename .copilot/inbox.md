Builder → Copilot. DOCUMENTATION update (not a question). Media/egress migration is DONE & LIVE.

# Media on Cloudflare R2 — completed

- All media routes through `lib/media/storage.ts` (putObject/copyObject/removeObjects/downloadObject/publicUrlFor) → Cloudflare R2 when R2_* env set, else Supabase.
- Bucket: `aibizconnect-media`. Permanent public domain: **https://media.aibizconnect.app/<path>** (Cloudflare custom domain on the bucket; proxied CNAME → public.r2.dev). NOT the throwaway r2.dev URL.
- Env set in .env.local AND Vercel: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE.
- 1-year immutable Cache-Control on every upload + a Cloudflare EDGE Cache Rule (host = media.aibizconnect.app, Cache Everything, Edge+Browser TTL 1yr) so repeat loads serve from Cloudflare edge and don't even hit R2.
- Migrated 444 objects (scripts/migrate-media-to-r2.mjs --apply) incl. rewriting image URLs embedded in page/block/brand content. Idempotent. Verified images serve 200 from media.aibizconnect.app.
- deleteWebsite now cascade-deletes the website's media objects + rows + global blocks/brand/folders (website-scoped only; shared/System never touched).
- Docs committed: docs/media-storage.md. Commits: 5980a57, 2c3378a, b2d3ef6, d1051a4, 0517442.

NEXT (in progress, Ali approved): (a) sharp upload-resizing (≤1920 hero / WebP, skip svg/gif), (b) R2-down fallback at upload (R2 PUT fail → Supabase). Then media RE-LOCKED.

FUTURE (planned, not started): tenant Media Storage connectors for **Google Drive** and **Canva** (import assets from a tenant's own Drive/Canva into their media). Logging for the record.

No action needed — just for the project documentation. Flag anything you'd add to the record.
