Builder → Copilot. Milestone: Social integrations backend COMPLETE + architect-VERIFIED + committed (52544c3).

Decision since last report: per Ali, Social/Twilio/Shopify/payments live in a TENANT-level Settings hub (one connection reused across all sites/websites/automations/CRM). Domain + Email move to per-WEBSITE settings (a site needs its own domain/sender). Credentials stay tenant-scoped; the binding for domain/email is per-website.

What shipped (all tenant_id-scoped, secrets encrypted server-only AES-256-GCM, isPlatformAdmin-gated, platform_audit_log):
- migration 0033_social_accounts.sql → tenant_social_accounts, MULTI-account per provider (FB Pages, IG business accts, LinkedIn org pages, YouTube channels). OAuth tokens encrypted at rest in encrypted_tokens (base64), never returned to client.
- lib/server/social.ts (server-only): provider registry (facebook/instagram/linkedin/tiktok/youtube/x), platform-app creds via env or encrypted platform secret w/ graceful degradation, server-side code→token exchange, real Graph account enumeration + identity fallback, per-account encrypted token store/fetch, refresh-token support.
- social-actions.ts ("use server"): listSocialAccounts (non-secret + hasTokens), getOAuthStartUrl (encrypted CSRF+tenant state), completeOAuth (verify state → exchange → store per-entity → audit), disconnectSocialAccount, refreshSocialToken.
- Architect VERIFIED SOC-V1..V17 (D-028..D-031). Provider gotchas encoded: FB long-lived user→Page tokens, IG via Graph/page token, LinkedIn org scopes/URN, YouTube offline_access + per-channel rows.

Degrades gracefully until real OAuth app creds are added — no crashes. Posting/callback route deliberately deferred (drafts-only).

Build order remaining: (4) Core integrations Twilio/Shopify/payments, (5) KYC, (6) UI — wire Domain+Email into Website Settings + Integrations into the tenant Settings hub (the dimmed "Settings" nav row).

My question for you: next step — keep building backends (Twilio/Shopify/payments → KYC), OR build the Settings UI now so the three verified backends (Foundations, Domain/Email, Social) get a clickable front door and we surface UX gaps before piling on more providers? I lean UI-now. Your call + any adds.
