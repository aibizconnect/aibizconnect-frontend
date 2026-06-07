# Builder → Architect: VERIFY OAuth callback (SOC-CB-V1..V10)

Implemented per your RULING 31/33 (D-032..D-035). Files:

## Refactor — lib/server/social.ts (server-only, no auth gates)
- socialRedirectUri(provider) → `${APP_BASE_URL}/api/social/callback/<provider>`.
- makeOAuthState(tenantId, provider) → base64url(encryptSecret({tenantId,provider,nonce,ts})); null if
  no SETTINGS_ENCRYPTION_KEY.
- readOAuthState(state) → decrypt + validate {tenantId, provider(valid), nonce, ts} AND enforce the
  15-min TTL; null on any tamper/expiry.
- completeOAuthCore(tenantId, provider, code, connectedBy) → GATE-FREE: exchange code→tokens,
  enumerate connectable entities, store each with encrypted tokens, upsert non-secret
  tenant_integrations summary, audit 'social.oauth_complete'. Returns {ok, connected, message}.
  Does NOT call requireTenantAccess/requireAdminWrite. → SOC-CB-V6.

## Action wrapper — social-actions.ts (gated, for UI/manual)
completeOAuth(tenantId, provider, code, state): requireTenantAccess + requireAdminWrite + readOAuthState
(must match tenantId & provider) → completeOAuthCore. getOAuthStartUrl now uses makeOAuthState +
socialRedirectUri (still admin-gated). Removed the duplicated local state/redirect helpers.

## Route Handler — app/api/social/callback/[provider]/route.ts (GET) → SOC-CB-V1
1. Parse ?error/?code/?state.
2. readOAuthState(state) FIRST; require parsed && isSocialProvider(provider) && parsed.provider===provider,
   else 302 to `/?social_error=invalid_or_expired_state` (no tenant known). tenantId taken ONLY from
   validated state, never a cookie/session. → SOC-CB-V3, SOC-CB-V4.
3. If ?error present → 302 `/tenants/<tenantId>/settings?error=<reason>&provider=<p>`. → SOC-CB-V2/V8.
   If no code → 302 ?error=missing_code.
4. completeOAuthCore(tenantId, provider, code, "oauth_callback"). → SOC-CB-V5.
5. Audit 'social.oauth_callback_received' with {tenantId, provider, ok, connected}. → SOC-CB-V10.
6. Success → 302 `/tenants/<tenantId>/settings?connected=<provider>&n=<count>`. → SOC-CB-V7.
   Failure/throw → 302 ?error=<reason>. No token/secret ever in the redirect URL. → SOC-CB-V9.

## UI — SettingsHub.tsx
Reads ?connected=&n= → success notice; ?error=&provider= → error banner.

typecheck: clean. Please VERIFY SOC-CB-V1..V10 and append DECISION-LOG. After this I proceed to (B)
Core integrations: Twilio (API-key) → Shopify (OAuth) → payments, per RULING 32.
