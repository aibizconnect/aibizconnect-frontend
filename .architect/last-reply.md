### CONTROL RULING: VERIFIED

The Builder has successfully implemented the Social Integrations backend according to the approved data model and application logic, addressing all specified Supervisor checks.

**Verification Details:**

**For Migration `0033_social_accounts.sql`:**
*   **SOC-V1:** Verified. The `public.tenant_social_accounts` table is created exactly as specified in RULING 28, including all columns, types, defaults, and the `UNIQUE (tenant_id, provider, external_id)` constraint.
*   **SOC-V2:** Verified. The `idx_tsa_tenant` and `idx_tsa_tenant_provider` indexes are correctly created.
*   **SOC-V3:** Verified. The `encrypted_tokens` column is `TEXT NOT NULL`, consistent with the accepted deviation for base64-encoded encrypted payloads (D-023).
*   **SOC-V4:** Verified. The `scopes` column is `TEXT[] NOT NULL DEFAULT '{}'`.

**For Social Application Logic (`lib/server/social.ts` and `app/tenants/[tenantId]/settings/social-actions.ts`):**
*   **SOC-V5:** Verified. All server actions are gated by `requireTenantAccess(tenantId)`, ensuring strict tenant-scoping.
*   **SOC-V6:** Verified. `listSocialAccounts` correctly returns non-secret fields and a `hasTokens` boolean, without exposing raw tokens.
*   **SOC-V7:** Verified. `getOAuthStartUrl` constructs the authorization URL with an encrypted `state` parameter for CSRF and tenant binding, and includes YouTube-specific parameters for refresh tokens.
*   **SOC-V8:** Verified. The code exchange for tokens is performed entirely server-side within `exchangeCodeForTokens` and `completeOAuth`.
*   **SOC-V9:** Verified. Platform app credentials are correctly sourced from environment variables or the encrypted platform secret (`SYSTEM_TENANT_ID`, `provider '<p>_platform_app'`).
*   **SOC-V10:** Verified. `completeOAuth` encrypts all sensitive tokens using `lib/server/encryption.ts` and stores them in `tenant_social_accounts.encrypted_tokens`.
*   **SOC-V11:** Verified. `completeOAuth` (via `fetchConnectableAccounts` and `storeSocialAccount`) correctly upserts `tenant_social_accounts` rows, populating all required metadata fields.
*   **SOC-V12:** Verified. `fetchConnectableAccounts` handles providers that return multiple connectable entities (e.g., Facebook Pages, YouTube channels) by creating separate `tenant_social_accounts` entries.
*   **SOC-V13:** Verified. `disconnectSocialAccount` attempts best-effort token revocation and deletes the corresponding `tenant_social_accounts` row.
*   **SOC-V14:** Verified. `refreshSocialToken` (via `refreshAccessToken`/`refreshSocialAccountToken`) correctly refreshes tokens, re-encrypts them, and updates expiry.
*   **SOC-V15:** Verified. All sensitive actions (`oauth_start`, `oauth_complete`, `disconnect`, `refresh_token`) are correctly audited via `logPlatformEvent` to `platform_audit_log`.
*   **SOC-V16:** Verified. The system degrades gracefully (`socialProviderReady()` check) when platform app credentials are not configured.
*   **SOC-V17:** Verified. Raw (decrypted) tokens are never exposed to the client-side.

The `tsc-clean` status is noted. The accepted deviation for `TEXT` vs `bytea` for encrypted payloads (D-023) is confirmed to be consistently applied.

---
DECISION-LOG
[D-031] verified_social_integrations_backend — Social integrations backend (data model and application logic) verified against all SOC checks (status: verified)