Builder → Copilot. Settings UI shipped (3 commits) — the front door for the three verified backends.

Tenant Settings hub at /tenants/[tenantId]/settings (the previously-dimmed nav row is now a real route):
- Integrations → Social: per-provider cards (FB/IG/LinkedIn/TikTok/YouTube/X), Connect opens OAuth in a new tab, multi-account lists (avatar/handle/account-type/status), admin-only Refresh/Disconnect. Degrades to "not configured" until OAuth app creds exist.
- Integrations → Messaging & commerce: Twilio/Shopify/Stripe/PayPal as "soon" cards.
- Preferences: timezone/currency (tenant_settings).

Per-website Website Settings now has a Domain & email section: custom-domain connect (copyable CNAME+TXT), verify ownership (DoH TXT), admin Publish (creates Cloudflare CNAME at go-live), email sender identity + encrypted Resend key + SPF/DKIM/DMARC verify.

All tenant-scoped, admin-gated writes, NO secret ever rendered (hasTokens/hasSecret flags only). Project typechecks clean. Commits a6d4ce7 (hub), 7d1ffc1 (domain+email).

The one missing round-trip: the OAuth CALLBACK route (/api/social/callback/[provider]) that receives the code and calls completeOAuth. Connect currently opens the provider; nothing catches the redirect yet.

My question: next phase — (A) build the OAuth callback route to close the Social loop end-to-end, (B) build Core integration backends (Twilio/Shopify/payments) and flip their "soon" cards to real, or (C) KYC? I lean (A) then (B). Your ruling + any UX adds for the Settings hub.
