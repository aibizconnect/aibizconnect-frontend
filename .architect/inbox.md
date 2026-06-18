# Milestone: built the custom-domain "switch" capability (keystone = Vercel attach)

Status + one design question. (Ali asked us to "build it to be able to make the switch" for
aibizconnect.app — NOT to flip DNS yet.)

## Problem found
The apex `aibizconnect.app` + `www` still serve the OLD Lovable "ABC SalesMaster" site (A →
172.64.80.1 via Cloudflare). `app.aibizconnect.app` is correctly on our Vercel deployment.
The existing domain stack (reserve subdomain → add custom → verify TXT → publish CNAME via the
Cloudflare API) had a **keystone gap**: it never registers the hostname with **Vercel**. Pointing
DNS at our edge is necessary but not sufficient — Vercel returns DEPLOYMENT_NOT_FOUND for any host
not attached to the project. Free subdomains only work because `*.aibizconnect.app` is a wildcard
on the project (wildcards don't cover the apex or external domains).

## Built (typechecks; production build green)
1. `lib/server/vercel.ts` — Vercel Domains client: addProjectDomain / getProjectDomain /
   verifyProjectDomain / getDomainConfig (misconfigured?) / removeProjectDomain + recommendedVercelDns.
   Token from VERCEL_API_TOKEN or encrypted platform secret (`vercel_platform`); graceful when absent.
2. `lib/server/cloudflare.ts` — `createARecord` (apex can't be a CNAME; DNS-only, Vercel terminates
   TLS) + `isPlatformApex` / `isInPlatformZone`.
3. `domain-actions.ts` — `publishDomainDns` now ALSO attaches to Vercel + creates apex-A / sub-CNAME;
   `domainHealth()` = 3-layer readiness checklist (DNS · Vercel attach+verify+config · routing);
   `claimPlatformApex()` = one call that attaches aibizconnect.app + www + writes their DNS;
   `platformApexStatus()` = read-only status for the console.
4. `middleware.ts` — www → apex 308 (canonical).
5. `scripts/domain-switch.mjs` — `check` (read-only, no token) + `activate --yes`.
6. Platform admin console: "Platform domain" section + `PlatformDomain.tsx` (status + one-button switch).
7. `docs/DOMAIN-SWITCH-RUNBOOK.md`.

Only human step left: paste `VERCEL_API_TOKEN` (+ Cloudflare token/zone if not set). Then one
button / one script flips it. Fully reversible (restore the A record + removeProjectDomain).

## Design question
For external tenant custom domains (their own zone, not ours), two paths exist: (a) CNAME/A at
their registrar pointing to Vercel + we attach on Vercel (TXT-verify ownership), or (b) full
nameserver delegation to our Cloudflare account (getOrCreateZone) so we manage their DNS. Current
code supports both primitives. Which should be the DEFAULT tenant flow — registrar records (less
intrusive, customer keeps their DNS) or NS delegation (we control everything, fewer support
tickets)? Leaning (a) as default with (b) as an "advanced/managed" upgrade. Concur?

## Note
`tenant_domains` carries two overlapping column generations (legacy `lib/domains.ts`:
custom_domain_status/payer/paid vs current domain-actions: domain_name/type/status/
verification_challenge_*). Current model is source of truth; legacy helpers to be retired later.
