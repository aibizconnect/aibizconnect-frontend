# Occasions — add it to GHL as a new menu

Goal: every AIBizConnect / GHL sub-account (and agency user) sees an **Occasions** item in their
left menu that opens the branded control panel (`/tools/occasions/app`), signed in to *their*
account automatically. Paid accounts get unlimited sites; free accounts get 1.

This is **additive** — it does not touch the existing public funnel (aibizconnect.ca/occasions),
the welcome-email pipeline, the embed renderer, or any registered site.

---

## What was built (this app)

- **Dashboard:** `app/tools/occasions/app/page.tsx` + `OccasionsDashboard.tsx` — the branded
  multi-domain control panel (My sites · Occasions · Appearance · Install · Help, free/paid).
- **Account layer:** `lib/server/occasion-widget-accounts.ts` — accounts, multi-site, signed
  session tokens, dormant GHL SSO decode, perk email.
- **Region map:** `lib/occasions-regions.ts` — Global / Canada / United States / My custom (no
  change to the locked engine).
- **Migration:** `supabase/APPLY_0085_occasions_accounts.sql` — **apply this in Supabase first.**

## Identity — how the dashboard knows which account it is

`page.tsx` resolves the location in this order:
1. **`?ssoData=…`** — the real GHL menu path (a GHL Marketplace custom page posts an encrypted
   user blob). **Dormant** until the marketplace app is registered + `GHL_SSO_KEY` is set
   (`decodeGhlSso` is stubbed to return null until then).
2. **`?t=<signed token>`** — an HMAC token we mint (`signLocationToken`). Use for testing / direct
   per-location links right now.
3. **`?loc=<locationId>`** — only works if that account already exists (so it can't open a
   stranger's data). Handy for a first manual setup.

## Go-live: two options

### Option A — Custom Menu Link (fastest, no app review)
GHL Agency → **Settings → Custom Menu Links → + Add**:
- **Name:** Occasions
- **URL:** `https://app.aibizconnect.app/tools/occasions/app?loc={{location.id}}`
  *(GHL substitutes the real sub-account id.)*
- **Open mode:** Iframe
- **Show on:** all sub-accounts (and/or agency)

Caveat: `?loc=` is not cryptographically signed, so for production-grade isolation move to Option B.
A middle-ground hardening (no app review) is a launch endpoint that turns `{{location.id}}` into a
signed `?t=` token — ask and I'll add `app/tools/occasions/launch`.

### Option B — Marketplace app SSO (secure, recommended for paid rollout)
1. Create a GHL Marketplace app (Developer portal) with a **Custom Page** pointing at
   `https://app.aibizconnect.app/tools/occasions/app`.
2. Copy the app's **SSO shared secret** → set env **`GHL_SSO_KEY`** on Vercel.
3. Implement the decrypt in `decodeGhlSso` (GHL uses CryptoJS AES over the shared secret) — the hook
   is already in place; flip it on once the secret exists.
4. Install the app to the agency → it appears in every sub-account's menu, auto-signed-in.

## Paid status (the gate)

"Paid" comes from **GHL's own billing**, surfaced to us as a tag:
1. In GHL, on subscription-active / payment-success, add a tag like **`abc-paid`** to the
   location/contact (workflow).
2. Point that workflow's webhook at our register endpoint (already live) **or** call
   `setAccountPlan(locationId, "paid")` — which flips the account to unlimited and (optionally)
   triggers the "Occasions is now included" email (`sendPerkEmail`).
Default is `free` (1 site + upgrade prompt), matching the design's free state.

## Checklist
- [ ] Apply `supabase/APPLY_0085_occasions_accounts.sql`.
- [ ] Confirm `OCCASIONS_WIDGET_SECRET` is set (already is — used for the signed token).
- [ ] Add the GHL menu (Option A now, Option B for secure paid rollout).
- [ ] Wire the `abc-paid` tag → `setAccountPlan(..., "paid")`.
- [ ] (Option B) set `GHL_SSO_KEY` + finish `decodeGhlSso`.
