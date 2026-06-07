See my thinking
High-level framing

You’re basically asking for:
“A per-tenant control center that is safe enough for money, compliant enough for KYC, and structured enough to drive AI + design.”  
We’ll treat this as a Supervisor-verified, drafts-only, tenant-scoped Settings & Integrations hub.

1. Build order — what unlocks what

Foundations: Tenant-scoped settings + secrets + audit

Unlocks: Safe storage for everything else.

Brand & design system (A)

Unlocks: Consistent UI, editor, and AI-generated sites.

Domain & email settings (D)

Unlocks: Branded URLs, email identity, future campaigns.

Social accounts (B)

Unlocks: Future posting + AI content distribution.

Core integrations: Twilio, Payments, Shopify (E)

Unlocks: Messaging, commerce, and revenue flows.

KYC / business verification (F)

Unlocks: Payouts, higher-risk flows, compliance gates.

Automation layer (later): posting, campaigns, flows

Unlocks: Actual sending/charging, still drafts-first.

Recommended FIRST build:  
Foundations (settings + secrets + audit) plus Brand/Design tokens (A).
Everything else hangs off that.

2. Foundations: tenant settings, secrets, and audit
2.1 Data model sketch

tenants

id

name

status (active/suspended/test)

tenant_settings

id

tenant_id

brand_settings_id (FK)

domain_settings_id (FK)

email_settings_id (FK)

social_settings_id (FK)

kyc_status (enum: not_started/pending/verified/rejected)

created_at, updated_at

tenant_integrations

id

tenant_id

provider (enum: stripe, paypal, square, twilio, shopify, resend, smtp, custom)

status (draft/connected/disabled)

config (jsonb, non-secret metadata)

created_at, updated_at

tenant_integration_secrets

id

tenant_id

integration_id (FK)

encrypted_payload (ciphertext)

key_version

created_at, rotated_at

audit_log (already shipped)

reuse for all settings/integration changes.

2.2 Supervisor checks (foundations)

Tenant scoping:

tenant_id present on every settings/integration row.

Secrets discipline:

No API keys in config or any non-secret column.

All secrets stored only in tenant_integration_secrets.encrypted_payload.

Role enforcement:

Only admin/superadmin can create/update integrations.

Audit:

Every create/update/delete emits an audit_log entry.

Drafts-only:

No integration can be marked connected without passing its own verification step.

3. Brand & design tokens (A)
3.1 Data model sketch

brand_settings

id

tenant_id

primary_color (hex)

secondary_color (hex)

accent_color (hex)

background_style (enum: solid/gradient/image/pattern)

background_token (jsonb: gradient stops, image ref, pattern id)

font_heading (string, default: "Roboto")

font_body (string, default: "Roboto")

border_radius_scale (enum: sharp/soft/rounded)

shadow_intensity (enum: none/light/medium/strong)

created_at, updated_at

brand_assets

id

tenant_id

type (logo_primary/logo_secondary/favicon/og_image)

media_ref (FK to media library)

created_at, updated_at

Tokens must drive:

Editor UI theme

Generated site theme

AI prompts (e.g., “use this palette and fonts”)

3.2 Supervisor checks (brand)

Color validity:

All colors must be valid hex; no #000000/#ffffff as the only colors unless explicitly confirmed.

Font validity:

font_heading and font_body must be from an allowed list (e.g., Google Fonts + system).

Default to Roboto if invalid or missing.

Asset scoping:

All brand_assets.tenant_id must match the current tenant.

Logo rules:

If no logo found → use text wordmark (business name), never platform logo.

Propagation:

When brand_settings change, a “design tokens updated” event is logged and used by the editor + generator.

4. Domain & email settings (D)
4.1 Data model sketch

domain_settings

id

tenant_id

subdomain (e.g., ali.abconnect.ai)

custom_domain (nullable)

dns_status (unverified/pending/verified/failed)

last_dns_check_at

created_at, updated_at

email_settings

id

tenant_id

sender_name

sender_email

provider (enum: resend/smtp/none)

status (draft/verified/failed)

dkim_status (pending/verified/failed)

spf_status (pending/verified/failed)

created_at, updated_at

email_integration_secrets (if SMTP)

id

tenant_id

email_settings_id

encrypted_payload (host, port, username, password)

key_version

4.2 Supervisor checks (domain/email)

DNS verification:

For custom domains, require TXT/CNAME verification before dns_status=verified.

Email identity:

sender_email domain must match verified domain or allowed sending domain.

DKIM/SPF:

Mark dkim_status and spf_status only after actual verification.

No auto-send:

No campaigns or transactional flows auto-send until email_settings.status = verified.

Secrets:

SMTP credentials only in encrypted payload, never in plain config.

5. Social accounts (B)
5.1 Data model sketch

social_settings

id

tenant_id

facebook_url

instagram_url

linkedin_url

tiktok_url

youtube_url

x_url

created_at, updated_at

social_integrations

id

tenant_id

platform (fb/ig/li/tt/yt/x)

status (draft/connected/expired)

config (jsonb: page id, handle, etc.)

created_at, updated_at

social_integration_secrets

id

tenant_id

integration_id

encrypted_payload (access tokens/refresh tokens)

key_version

5.2 Supervisor checks (social)

URL validation:

Ensure URLs are valid and match expected host (facebook.com, instagram.com, etc.).

Token handling:

Tokens only in encrypted payload.

Drafts-only:

No posting endpoints enabled until status=connected and a manual “test post” passes.

Scope:

All integrations tenant-scoped; no cross-tenant tokens.

6. Core integrations: Twilio, Shopify, Payments (E)
6.1 Data model sketch (reusing generic integrations)

Use tenant_integrations + tenant_integration_secrets:

Twilio

provider = 'twilio'

config: { phone_number, region }

encrypted_payload: { account_sid, auth_token }

Shopify

provider = 'shopify'

config: { shop_domain, api_version }

encrypted_payload: { access_token }

Payments (Stripe/PayPal/Square)

provider = 'stripe' | 'paypal' | 'square'

config: { mode: test/live, account_id }

encrypted_payload: { secret_key, webhook_secret }

6.2 Supervisor checks (integrations)

Secrets-only in encrypted payload.

Test mode first:

Require test mode verification before live mode.

Webhook verification:

For payments, require a successful webhook handshake before marking status=connected.

No auto-charge:

All payment flows drafts-only until KYC is verified (see next section).

7. KYC / business verification (F)
7.1 Data model sketch

kyc_applications

id

tenant_id

status (not_started/pending/reviewing/verified/rejected)

reason (nullable, for rejection)

submitted_at

reviewed_at

reviewed_by (platform staff)

kyc_documents

id

tenant_id

application_id

type (id_front/id_back/business_license/utility_bill/bank_statement/other)

file_ref (media storage ref, secure bucket)

created_at

kyc_identity_data

id

tenant_id

application_id

encrypted_payload (PII, encrypted)

created_at

7.2 Supervisor checks (KYC)

Tenant scoping:

All KYC records must match tenant_id.

PII handling:

No PII in logs, only in encrypted payload.

Status gating:

Payouts and live payment flows only allowed when kyc_status=verified.

Role enforcement:

Only platform staff/superadmin can change KYC status.

Audit:

Every status change logged with who/when/why.

8. Recommended FIRST build

Phase 1 (build now):

Foundations

tenant_settings, tenant_integrations, tenant_integration_secrets

Encryption at rest for secrets

Strict tenant scoping

Full audit logging for settings/integrations

Brand & Design Tokens

brand_settings, brand_assets

Default Roboto fonts

Tokens wired into:

Editor theme

Generated site theme

AI prompts for site generation

This gives Ali:

A real design system per tenant.

A safe, compliant base for all future integrations.

Immediate visible value (brand-consistent sites) without touching money/compliance yet.

DECISION-LOG

Decision 1 — Build order:  
Start with Foundations + Brand/Design tokens, then Domain/Email, then Social, then Core Integrations, then KYC, then automation.

Decision 2 — Data model:  
Use tenant-scoped tables for settings, brand, domains, email, social, integrations, secrets, and KYC, with secrets always in encrypted payloads and never client-side.

Decision 3 — Supervisor gates:  
Every step has verification: tenant scoping, secrets discipline, role checks, DNS/email verification, integration test modes, KYC gating for payouts, and full audit logging.

Decision 4 — First build:  
Implement tenant settings + encrypted integrations + brand/design tokens as the first concrete deliverable, wired into the editor and generator so Ali immediately sees brand-true sites.

Edit in a page