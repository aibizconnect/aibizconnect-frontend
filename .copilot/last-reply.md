Ali — logging this cleanly into the project record.
Your write‑up is already excellent; I’m only adding the minimal, high‑value items that matter for long‑term stability, compliance, and future engineers.

Below is the finalized documentation entry with only the additions worth keeping.

⭐ PROJECT RECORD — Media Connectors & Production Wiring (Completed & Live)

(Builder → Copilot: permanent engineering log)

Status

Media connectors (Google Drive + Canva) are fully implemented, verified in production, and Media Storage is now RE‑LOCKED.
All media now flows through the unified R2‑backed storage layer with CDN caching and permanent URLs.

Google Drive Connector (Per‑Tenant) — DONE

OAuth scope: drive.readonly + email

Encrypted per‑tenant token: google_drive (with refresh)

Server module: lib/server/google-drive.ts

Features:

Browse Drive images

Multi-select import

Sharp → WebP optimization

Upload to R2

Insert into tenant’s website_media folder

UI: DriveTab.tsx

Callback: /api/drive/callback

Verified end‑to‑end in production.

Canva Connector (Per‑Tenant) — DONE

OAuth 2.0 + PKCE

Compliance note:

code_verifier not stored in state (forbidden by Canva)

Stored in short-lived HttpOnly SameSite=Lax cookie

state contains only {tenantId, nonce} (encrypted)

Callback verifies nonce

Async export job:

Create export

Poll

Retrieve PNG URLs

Server module: lib/server/canva.ts

UI: CanvaTab.tsx

Callback: /api/canva/callback

Verified in production (Ali’s Canva account).

Platform & UX — DONE

Platform Connected Apps:

google_drive_platform_app

canva_platform_app

Redirect URIs:

https://app.aibizconnect.app/api/drive/callback

https://app.aibizconnect.app/api/canva/callback

Folder rail:

Pinned: Google Drive / Canva / AI Images

Protected: no rename/delete/drag

Old “Canava” folder auto‑merged

Opening:

Drive → Drive connector

Canva → Canva connector

AI Images → AI generator

Bugfix: callbacks now redirect to /tenants/{id}/media.

Production Environment — DONE

Custom domain: app.aibizconnect.app

CNAME → Vercel DNS

Cloudflare grey-cloud

Fixes all OAuth flows

Vercel env:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

SUPABASE_SERVICE_ROLE_KEY

SETTINGS_ENCRYPTION_KEY (matches local)

R2_* (5 vars)

AI_IMAGE_GEN_ENABLED

DB fix:

tenant_secrets table was missing (0031 never applied)

Created table

Re-saved platform app creds

Decryption verified

Security:

Superadmins cannot be deactivated

UI + server enforcement

Next (In Progress)

Sharp upload resizing

≤1920px hero

WebP

Skip SVG/GIF

R2-down fallback

If R2 PUT fails → Supabase Storage

Ensures no broken uploads

After this: Media re-lock stays enforced

Future (Planned)

Tenant Media Connectors:

Google Drive (full asset import)

Canva (design import)

Logging & monitoring

Canva app review for multi-tenant production use

⭐ Recommended Additions (Copilot’s review)

These are the only items I’d add to the record — all are practical, low‑noise, and relevant.

1. R2 CORS Policy (Required for Editor & Media Library)

Add CORS rules to R2 bucket:

Allowed origins:

https://app.aibizconnect.app

https://*.aibizconnect.app

http://localhost:3000

Methods: GET, PUT, DELETE, HEAD

Headers: content-type, authorization, x-amz-acl

2. R2 Lifecycle Rules

Optional but recommended:

Auto-delete temporary uploads

Auto-clean unused thumbnails

Auto-transition large assets to cheaper storage class

3. Monitoring / Alerts

Add alerts for:

R2 storage growth

R2 error rates

Supabase fallback usage

OAuth connector failures

Media migration anomalies

4. Media Path Convention

Document canonical path format:

<tenantId>/<uuid>.<ext>

This ensures predictable organization and future multi-region replication.

⭐ Final Verdict

This is a textbook-perfect implementation of multi-tenant media connectors and R2-backed storage.
The only additions worth logging are:

R2 CORS

Lifecycle rules

Monitoring

Path conventions

Everything else is already excellent and production-grade.

Edit in a page