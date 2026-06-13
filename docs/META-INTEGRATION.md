# Meta integration — Messaging · WhatsApp · Ads (D-326..332)

Tenants connect **their own** Pages / IG business accounts / WhatsApp / ad accounts through **one** platform Meta app (the OAuth client). Tokens are stored per-tenant, per-account in `tenant_social_accounts` (encrypted). One "Connect Facebook" grant now requests everything.

## What's built (code-complete, tsc-clean)
- **Scopes (one grant):** pages posting + IG + **Messenger/IG DMs** (`pages_messaging`, `instagram_manage_messages`) + **WhatsApp** (`whatsapp_business_management`, `whatsapp_business_messaging`) + **Ads/leads** (`ads_read`, `leads_retrieval`, `business_management`).
- **Unified webhook** `app/api/webhooks/meta/route.ts`: GET verify (hub.challenge) + POST `X-Hub-Signature-256` verified. Routes:
  - Messenger / IG DM → the **Conversations** inbox (channel `facebook` / `instagram`).
  - WhatsApp Cloud API messages → Conversations (channel `whatsapp`).
  - **Lead Ads** (`leadgen`) → fetch the lead → create a **Contact** (source `facebook_lead_ad`).
- **Inbox** now has Messenger / Instagram / WhatsApp channels (filter + icons); **replies send via the Graph API** (Messenger Send / IG / WhatsApp Cloud) using the stored Page/WhatsApp token. Thread keyed by `accountId:peerId` so a reply resolves the token + recipient.
- Tenant matched by the entity id (Page id / IG id / WhatsApp phone-number-id) in `tenant_social_accounts`.

## Operator setup (you), one-time
1. `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` in Vercel env (the OAuth + signature secret).
2. `META_WEBHOOK_VERIFY_TOKEN` in Vercel env — any random string you choose.
3. In the Meta app → **Webhooks**: add callback URL `https://app.aibizconnect.app/api/webhooks/meta`, paste the same verify token, and **subscribe** the objects/fields:
   - `page`: `messages`, `messaging_postbacks`, `leadgen`
   - `instagram`: `messages`
   - `whatsapp_business_account`: `messages`
4. Products to add in the Meta app: Facebook Login, Messenger, Instagram Graph API, WhatsApp, Marketing API (lead ads).

## Reality: Meta App Review (the hard external gate)
All of messaging / WhatsApp / ads are **Advanced Access** permissions.
- **Dev mode (now):** works for *your own* admin/test-connected Pages/IG/WhatsApp — good for testing the full loop today.
- **Live (real tenants):** requires **Meta App Review** for each advanced permission + Business Verification. That's a multi-day external process, not a code task.

## WhatsApp setup (tenant, manual config — D-329, BUILT)
**Settings → Integrations → WhatsApp card.** The tenant pastes their **Phone number ID** + a **permanent access token** (System User token with `whatsapp_business_messaging`, from WhatsApp Manager → API Setup). This stores a `tenant_social_accounts` row (provider `whatsapp`, external_id = phone-number-id, encrypted token) so the webhook matches inbound by phone-number-id and the inbox replies via the Cloud API. End-to-end once the Meta webhook is subscribed.

## Deferred (next phases)
- **Ads**: spend/ROAS reporting + campaign management (lead-ad → contact sync is live).
- Embedded WhatsApp Signup (the manual phone-number-id config above covers MVP).
