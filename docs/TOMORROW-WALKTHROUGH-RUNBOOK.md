# Live Walkthrough Runbook — Sign-up → Tenant → Wizard → Website → Domain

Goal: walk the **full new-customer journey** end-to-end, live: create an account, run the
onboarding wizard, generate a website, edit + publish it, and (stretch) point a domain at it.

Verified against code on 2026-06-17. The flow is **functional end-to-end**; the only piece that
needs setup is the custom domain (Cloudflare credentials). Core path works today.

---

## TL;DR readiness

| Step | State | Needs before demo |
|------|-------|-------------------|
| Sign up (Supabase email+password) | ✅ works | A **real inbox** you can open live (email confirm is mandatory) |
| Email confirm → `/auth/callback` | ✅ works | Supabase redirect-URL allowlist must include `https://app.aibizconnect.app/auth/callback` |
| `/onboarding` wizard (3 steps) | ✅ works | — |
| Tenant creation + owner link | ✅ works | — |
| Genesis blueprint (CRM, modules, subdomain) | ✅ works | — |
| AI sitemap → draft pages | ✅ works | OpenAI/Gemini key set → AI; if not, deterministic template fallback (still works) |
| Edit in builder | ✅ works | — |
| **Publish** → public URL | ✅ works | — |
| View live at `/sites/{tenantId}/home` | ✅ works | — |
| **Custom domain / subdomain** | 🟡 built but OFF | **Cloudflare API token + zone ID** in Vercel env + a **`*.aibizconnect.app` wildcard domain on the Vercel project** |

---

## PRE-FLIGHT (do these BEFORE we start)

1. **Pick a fresh test email** with a reachable inbox (Gmail, or a `you+demo@gmail.com` alias).
   Per identity rule, **don't use `info@ali.realtor`** in this app. A throwaway/real Gmail is ideal
   because we need to click the confirmation link live.
2. **Supabase → Authentication → URL Configuration**: confirm the **Redirect URLs** allowlist has
   `https://app.aibizconnect.app/auth/callback` (and `http://localhost:3000/auth/callback` for local).
   *(If "Confirm email" is OFF in Supabase, sign-up auto-confirms and we skip the inbox step — either
   is fine, just know which one is set so there are no surprises.)*
3. **Decide the tenant**: this walkthrough **creates a real tenant** (sanctioned by your explicit ask;
   overrides the ONE-TENANT rule for the test). Decide up front whether we **keep** it or **purge** it
   after (we have the `delete_tenant_cascade` RPC + purge script from last time).
4. **(Stretch — domain only)** If we want to point a domain live, set in **Vercel → Project → Settings →
   Environment Variables** (Production):
   - `CLOUDFLARE_API_TOKEN` — token with DNS edit on the `aibizconnect.app` zone
   - `CLOUDFLARE_ZONE_ID` — zone ID for `aibizconnect.app`
   And add a **wildcard domain `*.aibizconnect.app`** to the Vercel project, with the matching
   Cloudflare DNS so subdomains actually reach the app. (See "Custom domain" section — this is the
   real work; without it the Publish-domain button returns "Cloudflare is not configured.")

---

## THE WALKTHROUGH (the happy path, step by step)

1. **Go to** `https://app.aibizconnect.app/login` → toggle to **Sign up**.
2. Enter the test email + a password (≥8 chars) → **Sign up**. You'll see *"Check your email to
   confirm your account, then sign in."*
3. **Open the inbox**, click the confirmation link → lands on `/auth/callback` → session set → home.
4. New user has no tenant → auto-redirect to **`/onboarding`**.
5. **Wizard Step 1** — Business name (e.g. "Summit Realty"). Email is pre-filled, read-only.
6. **Wizard Step 2** — pick an **industry** (e.g. Real Estate).
7. **Wizard Step 3** — location (Country / Region / City, e.g. Canada / Ontario / Richmond Hill).
8. Click **"Generate my site."** Backend (≈10–60s):
   - creates the **tenant** + **owner** row,
   - runs **Genesis** (CRM pipeline, industry modules, sample listings if real-estate, a reserved
     `{slug}.aibizconnect.app` subdomain record),
   - asks the **AI for a sitemap**, validates it, writes **draft pages** (Home/About/Services/…).
9. Success card: **"🎉 Your site is ready."** Two buttons:
   - **Preview my site ↗** → `/sites/{tenantId}/home?preview=1` (yellow "draft" banner).
   - **Continue setup →** → `/tenants/{tenantId}/launchpad`.
10. **Open the editor**: `/tenants/{tenantId}/website/builder?pageId={pageId}` (from Launchpad/Pages).
    Show: Add panel (incl. the new re-skinnable section library), edit text, Typography, SEO, etc.
11. **Publish**: click **Publish** (top-right). Sets `is_public=true`, copies draft → live.
12. **View it live (no auth):** `https://app.aibizconnect.app/sites/{tenantId}/home`
    *(the bare `…/sites/{tenantId}` now redirects to home too).*

---

## CUSTOM DOMAIN (stretch goal) — how it works + what's needed

**It's built, not a fantasy:** there's a `tenant_domains` table, host→tenant middleware routing,
the add/verify/publish UI (`Settings → Website → Domain`), a Cloudflare API client, and DoH-based
verification. The middleware already rewrites `{anything}.aibizconnect.app/` → that tenant's `/home`.

**What's OFF:** Cloudflare credentials aren't set, and the platform doesn't auto-attach hosts to
Vercel. So the last mile needs one-time infra setup.

**Cleanest demo = a subdomain under our own zone** (`summit.aibizconnect.app`):
1. Pre-flight #4 done (CF creds in Vercel + `*.aibizconnect.app` wildcard on the Vercel project,
   wildcard DNS in Cloudflare pointing at Vercel).
2. In the tenant: **Settings → Website → Domain** → reserve subdomain `summit` → **Publish**.
   Creates `CNAME summit.aibizconnect.app → edge.aibizconnect.app` (proxied) and flips status `active`.
3. Visit `https://summit.aibizconnect.app` → middleware routes to the tenant's home. Done.

**A real external domain** (e.g. `summitrealty.com`) also works via the same UI (CNAME → `edge.aibizconnect.app`
+ a `_aibizconnect-verify` TXT we check over DoH), **but** the apex must reach Vercel and the host be
accepted — for a clean live demo prefer the subdomain path above; treat an external apex as a follow-up.

> ⚠️ I can't enter the Cloudflare token or change Vercel settings for you (credentials/settings are
> yours to set). I'll guide it live, or we set it together before we start.

---

## KNOWN ROUGH EDGES (so nothing surprises us)

- **Email confirm is live and mandatory** unless Supabase auto-confirm is on — that's the #1 thing
  that can stall the demo. Have the inbox open.
- **Navigation between pages** only works if pages are wired in the editor's Navigation panel — the
  generated set links Home; check the menu before showing multi-page click-through.
- **One home page** per tenant; the public home is `…/home` (or whatever the home slug is).
- If the AI provider hiccups, the sitemap **falls back to the industry template** — the site still
  generates, just less bespoke copy. Not a failure.

---

## AFTER THE DEMO

- If we agreed to **purge**: run the tenant purge (`delete_tenant_cascade` RPC + CRM-mirror cleanup +
  `auth.admin.deleteUser` for the test account), same as the last soft-tenant purge.
- If we **keep** it: note it in memory as a sanctioned second tenant and decide its real subdomain.
