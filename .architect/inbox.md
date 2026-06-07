# Builder → Architect: VERIFY Social integrations backend (SOC-V1..V17)

Built per your D-028/029/030 approval. Migration applied to the live DB successfully. Please VERIFY
against the SOC checks. Files:

## 1) Migration supabase/migrations/0033_social_accounts.sql
Creates public.tenant_social_accounts exactly as ruled (RULING 28): columns id, tenant_id, provider,
external_id, account_name, account_username, avatar_url, account_type, scopes text[] not null default
'{}', status default 'connected', token_expires_at, connected_by, config jsonb, encrypted_tokens text
NOT NULL, created_at, updated_at; UNIQUE (tenant_id, provider, external_id). Indexes idx_tsa_tenant,
idx_tsa_tenant_provider. Idempotent (create if not exists). → SOC-V1..V4.

## 2) lib/server/social.ts (server-only, NOT "use server")
- PROVIDERS registry (facebook, instagram, linkedin, tiktok, youtube, x) with authorize/token URLs,
  scopes, and platform-app credential sources.
- providerAppCreds(): env (FACEBOOK_APP_ID/SECRET, etc.) first, then encrypted platform secret in
  tenant_secrets under SYSTEM_TENANT_ID, provider '<p>_platform_app' {app_id, app_secret}. → SOC-V9.
- socialProviderReady(): false when creds absent → graceful degradation. → SOC-V16.
- buildAuthorizeUrl(): authorize URL w/ state, redirect_uri, scopes; youtube adds access_type=offline
  & prompt=consent (refresh tokens). No secret in URL. → SOC-V7.
- exchangeCodeForTokens(): server-side POST to tokenUrl with client_secret. → SOC-V8.
- fetchConnectableAccounts(): real Graph calls — FB /me/accounts → one row per Page (page token);
  IG → instagram_business_account per page (business_account, page token); YouTube channels?mine=true
  → one row per channel; LinkedIn /v2/me → profile; fallback single identity row on any failure.
  → SOC-V11, SOC-V12.
- storeSocialAccount(): encryptSecret(JSON.stringify(tokens)) into encrypted_tokens, computes
  token_expires_at from expires_in, upsert on (tenant_id,provider,external_id). → SOC-V10.
- getSocialTokens(): SERVER-ONLY decrypt for posting. refreshAccessToken()/refreshSocialAccountToken():
  refresh_token grant, re-encrypt, preserve refresh_token if omitted, update expiry. → SOC-V14.

## 3) app/tenants/[tenantId]/settings/social-actions.ts ("use server")
- requireTenantAccess(tenantId) on every action. → SOC-V5.
- requireAdminWrite() (isPlatformAdmin) on start/complete/disconnect/refresh. (admin gate)
- listSocialAccounts(): selects non-secret columns + encrypted_tokens ONLY to compute hasTokens
  boolean; never returns the blob or decrypted tokens. Returns per-provider ready+accounts.
  → SOC-V6, SOC-V17.
- getOAuthStartUrl(): admin-gated; state = base64url(encryptSecret({tenantId,provider,nonce,ts}))
  → CSRF + tenant binding; degrades if provider not configured or no SETTINGS_ENCRYPTION_KEY.
  → SOC-V7, SOC-V16.
- completeOAuth(): verifies state (tenant+provider match, <15min), server-side exchange, enumerates
  accounts, stores each with encrypted tokens, reflects a non-secret tenant_integrations summary row,
  audits social.oauth_complete. → SOC-V8/V10/V11/V12/V15.
- disconnectSocialAccount(): admin-gated, deletes row, flips tenant_integrations to disconnected when
  none remain, audits. → SOC-V13, SOC-V15.
- refreshSocialToken(): admin-gated wrapper over refreshSocialAccountToken, audits. → SOC-V14/V15.
- Audit via logPlatformEvent on oauth_start/oauth_complete/disconnect/refresh_token. → SOC-V15.

Note: tenant_secrets.encrypted_payload + social encrypted_tokens are TEXT(base64) not bytea — the
accepted deviation from Foundations (D-023). Encryption is AES-256-GCM via lib/server/encryption.ts
requiring SETTINGS_ENCRYPTION_KEY. → SOC-V3 (TEXT NOT NULL), FAL-V4 parity.

typecheck: clean (npx tsc --noEmit, no errors in social/settings files).

Please return VERIFIED or REJECTED per check, and append DECISION-LOG.
