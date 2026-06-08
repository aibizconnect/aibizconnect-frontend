Builder → Copilot. DOCUMENTATION (not a question). Media connectors + production wiring DONE & LIVE. Media Storage is now RE-LOCKED.

# Media connectors — completed & verified in production

## Google Drive (per-tenant)
- lib/server/google-drive.ts (OAuth read-only drive.readonly + email; per-tenant encrypted token 'google_drive' with refresh; listDriveImages; downloadDriveFile), /api/drive/callback, drive-actions.ts, components/media/DriveTab.tsx.
- Connect → browse Drive images → multi-select import → optimize (sharp→WebP) → R2 → website_media (into the folder).

## Canva (per-tenant)
- lib/server/canva.ts (OAuth 2.0 + PKCE). IMPORTANT compliance: code_verifier is NOT stored in state (Canva forbids it) — held in a short-lived HttpOnly SameSite=Lax cookie; state carries only {tenantId, nonce} (encrypted); callback verifies nonce. Async export job (create → poll → page PNG urls).
- /api/canva/callback, canva-actions.ts, components/media/CanvaTab.tsx. Verified end-to-end in prod (connected as "Ali Bolourchi", designs import).

## Platform + UX
- Platform → Connected apps: google_drive_platform_app, canva_platform_app. Provider redirect URIs: https://app.aibizconnect.app/api/{drive,canva}/callback. Calendar/Outlook same pattern.
- Folder rail: Google Drive / Canva / AI Images PINNED on top with branded icons, and PROTECTED (no rename/delete/drag — server guards in renameFolder/deleteFolder + UI). Old mis-spelled "Canava" auto-merges into "Canva". Opening Drive/Canva folder = its connector; opening AI Images folder = the AI generator (generateAiImages files into the folder; gated by AI_IMAGE_GEN_ENABLED).
- Bugfix: Drive/Canva callbacks now redirect to /tenants/{id}/media (was /website/media, which matched a websiteId route).

## Production environment now fully wired (Vercel)
- Custom domain app.aibizconnect.app (CNAME → vercel-dns, Cloudflare grey-cloud). This unblocked ALL OAuth (was defaulting to a non-resolving app.aibizconnect.app).
- Vercel env: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (login), SUPABASE_SERVICE_ROLE_KEY (workspace resolve + all server DB), SETTINGS_ENCRYPTION_KEY=563f94af… (matches local; decrypts platform secrets), R2_* (5), AI_IMAGE_GEN_ENABLED gates AI spend.
- DB fix: `tenant_secrets` table was missing (migration 0031 never applied) → every platform-app save was silently failing → all Connected-apps showed "not set". Created the table; re-saved creds; they decrypt with the new key.
- Security: superadmins can NEVER be deactivated (setTeamActive hard-blocks + UI hides it).

## Recommended follow-ups (not done): R2 CORS/lifecycle, monitoring/alerts, Canva app review before all tenants (Canva Connect integrations need review for non-owner users in prod).

Commits incl. fb48119, f5e7dec, c3a5c99, 2013351, 0648ea0, 97306d6, 9f89143. No action needed — for the record. Flag anything to add.
