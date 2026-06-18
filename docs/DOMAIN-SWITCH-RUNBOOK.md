# Domain Switch Runbook — make `aibizconnect.app` ours

**Goal:** the apex `aibizconnect.app` (and `www`) serve OUR Vercel deployment instead of the old
Lovable "ABC SalesMaster" site. This is the same machinery every tenant uses to connect a custom
domain — the apex is just its first customer.

## Current state (verified `2026-06-18`)

| Host | Serves today | A/CNAME | On Vercel? |
|---|---|---|---|
| `aibizconnect.app` | **old "ABC SalesMaster"** | A → `172.64.80.1` (CF proxy → old origin) | ✗ not attached |
| `www.aibizconnect.app` | 302 → apex | (CF) | ✗ |
| `app.aibizconnect.app` | **our app** ✅ | (CF → Vercel) | ✓ (wildcard) |

Run the preflight any time to re-check:
```
node --env-file=.env.local scripts/domain-switch.mjs
```

## Why a code change alone can't do it

Pointing DNS at Vercel is **necessary but not sufficient**. Vercel only serves a hostname that is
*registered on the project*; an unregistered host returns `DEPLOYMENT_NOT_FOUND`. Free subdomains
work today only because `*.aibizconnect.app` is a **wildcard** domain on the project — wildcards do
**not** cover the apex. So the switch = (1) attach `aibizconnect.app` + `www` to the project, and
(2) repoint their DNS.

## What's now built (this commit)

- `lib/server/vercel.ts` — Vercel Domains client: `addProjectDomain` / `getProjectDomain` /
  `verifyProjectDomain` / `getDomainConfig` / `removeProjectDomain` + `recommendedVercelDns`.
  Token from `VERCEL_API_TOKEN` (env) or the encrypted platform secret (`vercel_platform`).
- `lib/server/cloudflare.ts` — added `createARecord` (apex can't be a CNAME) + `isPlatformApex` /
  `isInPlatformZone` helpers.
- `domain-actions.ts` — `publishDomainDns` now **also attaches the host to Vercel** and creates the
  right record (apex A / subdomain CNAME); `domainHealth()` returns a 3-layer readiness checklist;
  `claimPlatformApex()` is the one-call switch for the platform apex + www.
- `middleware.ts` — `www.aibizconnect.{app,ca}` → apex 308 redirect (canonical).
- `scripts/domain-switch.mjs` — `check` (read-only, no tokens) + `activate --yes` (does the switch).

Everything degrades gracefully with no tokens (reports "not configured"); nothing live changes
until the tokens exist **and** the switch is run.

## The only human step: two tokens

Add to `.env.local` (local) and Vercel project env (production):

```
VERCEL_API_TOKEN=...        # vercel.com/account/tokens — scope to the team
CLOUDFLARE_API_TOKEN=...    # if not already set; needs Zone:DNS:Edit on the aibizconnect.app zone
CLOUDFLARE_ZONE_ID=...      # the aibizconnect.app zone id
```

> These are infra credentials, not personal passwords. Paste them yourself; I never type them.

## Flip the switch

Either path does the same thing:

**A. From the terminal**
```
node --env-file=.env.local scripts/domain-switch.mjs activate --yes
```

**B. In-product (platform admin)** — call `claimPlatformApex()` from the platform admin console
(wire a "Make aibizconnect.app primary" button to it), or for any tenant domain use the existing
Add → Verify → **Publish** flow in Website → Settings → Domain (Publish now attaches to Vercel too).

## After the switch

1. `scripts/domain-switch.mjs` should show all three hosts **READY** (served by our deployment).
2. The old "ABC SalesMaster" A record is replaced by the apex `A → 76.76.21.21` (DNS-only, grey
   cloud — Vercel terminates TLS at its edge).
3. `www` 308-redirects to the apex; the apex renders the marketing home (`app/page.tsx`).
4. Vercel auto-issues the TLS cert once DNS resolves (usually < 1 min).

## Rollback

Re-point the apex A record back to the old origin in Cloudflare and detach the host in Vercel
(`removeProjectDomain`), or just restore the previous A record. DNS-level, fully reversible.

## Note / TODO

`tenant_domains` carries two overlapping column generations (the older `lib/domains.ts` model:
`custom_domain_status`/`payer`/`paid`; the current `domain-actions.ts` model: `domain_name`/`type`/
`status`/`verification_challenge_*`). The current model is the source of truth; the legacy helpers
in `lib/domains.ts` should be reconciled/retired in a later pass (not needed for the switch).
