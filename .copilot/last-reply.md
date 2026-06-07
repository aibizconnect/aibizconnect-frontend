Ali — this batch is excellent.
Shopify is now implemented exactly the way a multi‑tenant, Supervisor‑verified platform should do it.
Everything you shipped matches the architectural contract we’ve been building for months.

Below is the full ruling — precise, technical, and structured so you can move directly into Payments.

✅ 1) Shopify HMAC‑first callback + offline token + multi‑store

No concerns. This is the correct model.

Here’s the breakdown:

HMAC‑first callback — CORRECT

Your flow:

Verify HMAC BEFORE anything else

Sort querystring lexicographically

Timing‑safe compare

Reject if invalid

Only then decrypt state

Only then check shop domain

Only then exchange code

This is the canonical Shopify security sequence.

Most developers get this wrong — you got it right.

Offline token — CORRECT

You used offline access (no grant_options[]=per-user)

You store the token encrypted at rest

You never expose it client‑side

You fetch /shop.json to validate the token

You pin API version (2024‑01)

You use minimal read scopes

This is exactly how Shopify expects multi‑tenant SaaS to behave.

Multi‑store per tenant — CORRECT

Your tenant_shopify_stores table is the right abstraction:

A tenant can connect multiple shops

Each shop has its own encrypted offline token

Each shop has its own metadata

Disconnect is clean

No auto‑sync

No auto‑webhooks

No auto‑billing

This is the safest possible implementation.

🟩 2) GO for Payments next — with one architectural rule

Yes — proceed to Payments next.

But here is the ruling you need before you start:

🧭 RULING: Use Stripe API keys NOW, Stripe Connect LATER
Why API keys now?

Faster to implement

Matches your existing tenant_integrations model

Perfect for “verify credentials only”

Drafts‑only means no charges, no payouts, no risk

You can verify with /v1/account safely

You can store publishable_key in config and secret_key encrypted

Why NOT Connect yet?

Stripe Connect introduces:

onboarding flows

account types

capabilities

payouts

KYC dependencies

webhook signing

multi‑tenant risk

Connect is the right long‑term direction, but only after:

KYC is implemented

Payments test mode is stable

You have a clear payout model

You have a Supervisor‑verified compliance layer

So the correct sequence is:

Stripe API keys (test mode only)

PayPal client_id/secret

Square (optional)

Stripe Connect (later, after KYC)

This matches your “no auto‑charge, no auto‑transfer” rule.

🟦 3) UX adds for Shopify before you move on

These are optional but recommended — they will make the Shopify card feel complete.

A. Add “Store domain” + “Plan” + “Currency” in the store list

You already fetch /shop.json.
Surface:

shop.myshopify_domain

plan_display_name

currency

This helps tenants identify which store is which.

B. Add “Token last refreshed” timestamp

You already store the offline token.
Add:

last_token_refresh_at

Show in UI:

Token valid (offline). Last refreshed June 7, 2026.

C. Add “Reconnect” state

If the offline token ever fails:

Mark store as Needs reconnect

Disable any future sync actions

Keep store visible

This matches the Social UX pattern.

D. Add a “Test connection” button

You already have the primitives:

Call /shop.json

If 200 → success

If 401/403 → expired token

This is extremely helpful for debugging.

E. Add a “No auto‑sync” badge

You already mention it in text.
Make it a badge:

Drafts‑only  
No auto‑sync. No auto‑import.

This reinforces safety.

📘 DECISION‑LOG

Decision 1 — Shopify callback model:  
Approved. HMAC‑first, offline token, multi‑store — all correct.

Decision 2 — Payments next:  
Approved.
Use Stripe API keys + PayPal client/secret first.
Stripe Connect comes later, after KYC.

Decision 3 — UX adds:  
Recommended: store metadata, token timestamps, reconnect state, test connection, drafts‑only badge.

If you want, I can generate the Payments integration blueprint or the Stripe test-mode verification spec next.

Edit in a page