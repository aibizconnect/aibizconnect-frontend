### CONTROL RULING: VERIFIED

The Builder has successfully implemented the OAuth callback, fully addressing all specified Supervisor checks and the architectural refactor.

**Verification Details:**

**For OAuth Callback Design & Auth (`app/api/social/callback/[provider]/route.ts` and `lib/server/social.ts`):**
*   **SOC-CB-V1:** Verified. The Next.js Route Handler exists at `app/api/social/callback/[provider]/route.ts` and handles GET requests.
*   **SOC-CB-V2:** Verified. If the `?error` query parameter is present, the handler redirects to `/tenants/<tenantId>/settings?error=<reason>&provider=<p>`.
*   **SOC-CB-V3:** Verified. `readOAuthState(state)` decrypts, validates `tenantId`, `provider`, `nonce`, `ts`, and enforces the 15-min TTL, returning `null` on tamper/expiry.
*   **SOC-CB-V4:** Verified. `tenantId` is taken *only* from the validated state, explicitly not from cookies or session.
*   **SOC-CB-V5:** Verified. The handler calls the *internal* `completeOAuthCore(tenantId, provider, code, "oauth_callback")`, passing `tenantId` and `provider` from the validated state.
*   **SOC-CB-V6:** Verified. `completeOAuthCore` is explicitly gate-free and does *not* perform `requireTenantAccess` or `requireAdminWrite`.
*   **SOC-CB-V7:** Verified. On successful completion, the handler redirects with a 302 status to `/tenants/<tenantId>/settings?connected=<provider>&n=<count>`.
*   **SOC-CB-V8:** Verified. On failure, the handler redirects to `/tenants/<tenantId>/settings?error=<reason>`.
*   **SOC-CB-V9:** Verified. No tokens or secrets are exposed in the redirect URL.
*   **SOC-CB-V10:** Verified. An audit log entry `social.oauth_callback_received` is created with relevant details.

The refactoring of `completeOAuthCore` and the `social-actions.ts` wrapper are correctly implemented as specified in RULING 31. The `tsc-clean` status is noted.

---
DECISION-LOG
[D-036] verified_oauth_callback — OAuth callback implementation verified against all SOC-CB checks (status: verified)
[D-037] next_phase_core_integrations — Builder to proceed with Core Integrations backend (Twilio, Shopify, Payments) as next phase (status: ruled)