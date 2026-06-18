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
| **Subdomain** `{slug}.aibizconnect.app` | 🟡 code ready, infra OFF | One-time **`*.aibizconnect.app` wildcard** on Vercel + DNS-only wildcard CNAME in Cloudflare. **No CF token.** Auto-reserved by the wizard; routes after publish. |
| **External custom domain** | 🟡 built, out of scope | Entitlement-gated + CF token + per-domain Vercel attach. Follow-up, not tomorrow. |

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
4. **(Subdomain demo)** This is the ONLY infra step, and it's a one-time wildcard setup — **no
   Cloudflare API token needed** (the token/verify/publish UI is only for *external* custom domains,
   which are also entitlement-gated). Do both:
   - **Vercel → Project → Settings → Domains**: add **`*.aibizconnect.app`** (apex is already verified
     since `app.aibizconnect.app` lives here). Vercel shows a CNAME target (e.g. `cname.vercel-dns.com`).
   - **Cloudflare (aibizconnect.app zone) → DNS**: add `CNAME  *  →  cname.vercel-dns.com`, **Proxy
     status = DNS only (grey cloud)** (Cloudflare free doesn't proxy wildcards; grey cloud lets Vercel
     terminate TLS cleanly). Complete any Vercel verification TXT if prompted.
   - Test with ONE host before the live run (see "Subdomain demo" below). Best done tonight/early so
     DNS + Vercel cert are warm.

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

## SUBDOMAIN DEMO (the chosen stretch goal) — how it works + what's needed

**Verified in code (2026-06-17):**
- The wizard's `provisionTenant` **auto-reserves `{slug}.aibizconnect.app`** — it inserts a
  `tenant_domains` row with the bare `subdomain` value (`lib/domains.ts addSubdomain`), `is_primary=true`.
- `middleware.ts resolveTenant` matches an incoming host's subdomain against that row (**no status gate,
  no Cloudflare call**) and rewrites `{slug}.aibizconnect.app/` → `/sites/{tenantId}/home`.
- The anon read the middleware uses was tested live: **HTTP 200** (RLS allows it).

**So with the one-time wildcard infra (pre-flight #4) in place, the subdomain "just works" right after
the wizard — no in-app Domain step, no Cloudflare token.** The flow:
1. Pre-flight #4 done: `*.aibizconnect.app` on Vercel + `* CNAME → cname.vercel-dns.com` (DNS-only) in Cloudflare.
2. Run the wizard (business name → slug). The tenant now owns e.g. `summit-realty.aibizconnect.app`.
3. **Publish the home page** (Step 11) — required, or the subdomain root hits an unpublished page.
4. Visit `https://summit-realty.aibizconnect.app` → live tenant home. Done.

> **Pre-test with one host (do this before the live run):** after pre-flight #4, confirm any subdomain
> reaches the app + serves a cert — e.g. open `https://test.aibizconnect.app` (expect our app's 404/redirect,
> NOT a Vercel "domain not found" or cert error). If that's clean, the wizard's auto-subdomain will resolve.

**External custom domain** (e.g. `summitrealty.com`) is a *separate, heavier* path: it's entitlement-gated
(`CUSTOM_DOMAIN` feature), uses the add/verify/publish UI + a Cloudflare API token + a `_aibizconnect-verify`
TXT over DoH, and the apex must be attached to Vercel. **Out of scope for tomorrow** — treat as a follow-up.

> ⚠️ I can't change Vercel settings or Cloudflare DNS for you (those are yours to set). I'll give exact
> values and verify routing the moment a subdomain is up.

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
