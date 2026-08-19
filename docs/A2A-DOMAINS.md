# A2A domain inventory (Cloudflare) — pulled 2026-07-10

Read-only audit via the CF API (token in `seo-geo-platform/.dev.vars`). Zone ids are not
secret (they appear in config/URLs). Used to plan the A2A edge rollout (Track 2) and to
backfill the client hierarchy (migration 0087: `hosting_model`, `cf_zone_id`, `cf_proxied`).

| Domain | Zone id | Proxied | Origin (apex) | Likely hosting_model | Notes |
|---|---|---|---|---|---|
| aibizconnect.app | c133b83a77af0401ffd25eaaf6d6dc12 | ✅ | Vercel | `platform_tenant` | The app. Track 1 (Next.js routes). |
| aibizconnect.ca | 4c9f367243b4493a44f32e25f80066f5 | ✅ | CF IP 162.159.140.166 / www→sites.ludicrous.cloud | `external`/`static` | corp site |
| lead-loop.co | e23ccf6c3d90cf5eaf571288915d6613 | ✅ | CF Pages | `static` | LeadLoop product |
| ali.realtor | 5110e4305abddf052f909a512cdd16f2 | ✅ | 23.21.221.218 (AWS, shared) | **confirm** | pilot; not yet an app tenant |
| the4sale.com | 931bc9ae9bbfdedeb382a91788b1c266 | ✅ | 23.21.221.218 | **confirm** | commercial brand |
| the4sale.net | e77fd999b8aac679c00619bc96cdfebf | ✅ | 23.21.221.218 | **confirm** | |
| gtaluxuryhomes.ca | fb1cbbd0f8b33f00965b91d1bac5d3d1 | ✅ | 23.21.221.218 | **confirm** | luxury brand |
| on-dreamhomes.com | d75e5eedad7ec8d8260485b05a5244cb | ✅ | 23.21.221.218 | **confirm** | |
| alibolourchi.com | 57b124814108f90393614f23daa1ea2e | ✅ | 23.21.221.218 | **confirm** | |
| bolourchi.com | 141631bd5c7b91abf54916cf7f165b02 | ✅ (proxied 2026-07-10) | CF IP 162.159.140.166 / www→sites.ludicrous.cloud | `external`/`static` | now orange; verified HTTP 200 (no loop); A2A routes active |
| **webtechies.net** | ef27823cfced9ca15bad72f1bac536c3 | ❌ **grey (keep OFF)** | 143.110.212.174 (DigitalOcean) | `wordpress` | **Owner decision 2026-07-10: stay OFF the CF proxy.** Excluded from CF edge A2A. (If ever wanted, serve A2A files via the WP plugin directly.) |

## Token scope
The CF API token in `seo-geo-platform/.dev.vars` has **Zone Read + DNS Read** only — enough for
this audit, but it **cannot attach Worker routes** (Workers Routes API returns auth error) or edit
DNS. To automate route attachment via API I need a token with **Workers Routes: Edit** (+ **DNS:
Edit** if enabling any proxy). Alternative that needs no such token: declare routes in the Worker's
`wrangler.toml` and let `wrangler deploy` (owner's own CF auth) attach them.

## Rollout implications
- **Proxy gaps:** `bolourchi.com` is grey (proxy only if it should get edge A2A). `webtechies.net`
  stays grey by owner decision — excluded from CF edge A2A.
- **Shared host `23.21.221.218` (AWS):** the realtor-brand cluster resolves here — confirm the
  platform (real-estate website builder? MyRealPage? WordPress?) so we tag `hosting_model`
  correctly. Doesn't block the edge build (handlers are origin-independent).
- **A2A routes** (`{domain}/llms.txt`, `{domain}/.well-known/agent-card.json`,
  `{domain}/.well-known/catalogue.json`) can be attached on all **proxied** zones. Each needs a
  published catalogue snapshot in the Worker KV first.
- `aibizconnect.app` stays **Track 1** (Next.js routes) per the hybrid decision — no Worker route.
