# `info@ali.realtor` inventory (audit 2026-07-10)

Where the `info@ali.realtor` address appears — live sites + repo files — with an action call.
**Policy:** real-estate properties may keep `info@ali.realtor`; every non-real-estate property
(AIBizConnect / WebTechies) must use its own `info@<domain>`. No typo (`ali.realtot`) or other
`@ali.realtor` local-part exists anywhere.

## ⛔ Action items (non-real-estate — FIX)

### Live sites
| Property | Where | Note | Fix to | Status |
|---|---|---|---|---|
| **aibizconnect.ca** | `LocalBusiness` JSON-LD in the **GHL site → Settings → Head tracking code** (email field; phone `+1-416-727-7111` kept) | Site is built in **GoHighLevel** (not ludicrous.cloud). Edited via Chrome; verified live = 0 × `info@ali.realtor`, 2 × `info@aibizconnect.ca` | `info@aibizconnect.ca` | ✅ done 2026-07-11 (live-verified) |

Clean (no occurrence): `aibizconnect.app`, `lead-loop.co`, `webtechies.net`, `bolourchi.com`.

### Repo files — `aibizconnect-app-workspace` (AIBizConnect product/consultancy material)
| File (rel to C:\server) | # | Context | Fix to | Status |
|---|---|---|---|---|
| projects\aibizconnect-app-workspace\AIBizConnect.App\broker_signup.html | 1 | "Questions?" `mailto:` | `info@aibizconnect.ca` | ✅ done 2026-07-10 |
| projects\aibizconnect-app-workspace\AIBizConnect.App\aibizconnect_ghl_website_setup.html | 2 | Discovery-Call CTA `mailto:` + checklist | `info@aibizconnect.ca` | ✅ done |
| projects\aibizconnect-app-workspace\AIBizConnect.App\aibizconnect_ghl_master_setup.html | 1 | "Reach out at …" (domain link to ali.realtor left as-is) | `info@aibizconnect.ca` | ✅ done |
| projects\aibizconnect-app-workspace\AIBizConnect.App\aibizconnect_lesson_content.html | 1 | Bootcamp certificate-request email | `info@aibizconnect.ca` | ✅ done |
| projects\aibizconnect-app-workspace\AIBizConnect.App\ghl_broker_webhook_handler.js | 1 | `// To: info@ali.realtor` — turned out to be inside a COMMENT (setup instructions for a GHL notification workflow), not live code | `info@aibizconnect.ca` | ✅ done 2026-07-11 (comment fixed). **Real routing = a GHL Automation workflow "Send Internal Notification Email" action — verify in GHL.** |

## ✅ Leave as-is — REAL ESTATE (your call: fine)

**Live realtor sites** (show it in visible contact copy + JSON-LD): `ali.realtor` (correct as-is),
`the4sale.com`/`the4sale.net`, `gtaluxuryhomes.ca`, `on-dreamhomes.com`, `alibolourchi.com`.
(`the4sale.net`→the4sale.com, `on-dreamhomes.com`→gtaluxuryhomes.ca, `alibolourchi.com`→ali.realtor
are 301 aliases, so fixing the 3 primaries would cover 5 sites — *optional*, only if you later want
per-domain emails on the realtor brands too.)

**Real-estate content files** (policy-driven, fine): `cma-project` (26 — CMA footers, mandated by
its CLAUDE.md), `trreb-monthly-stats` (17), `abre-blog-assistant` (5),
`first-time-home-buyer-quiz` (2), `daily-briefing` (4), `heygen-automation` (2), `otto-lite` (2).

## ◻︎ Reference only — do NOT change
Our A2A catalogue code/docs mention the address only to *describe the rule* that reserves it for
real estate: `lib/catalogue/hygiene.ts`, `lib/catalogue/extract.ts`, `.claude/skills/a2a-catalogue/SKILL.md`,
`docs/A2A-STATUS.md`, `docs/TOMORROW-WALKTHROUGH-RUNBOOK.md`. The `ali-realtor.ts` fixture +
`ali-realtor-catalogue.sql` seed correctly carry it (they represent the ali.realtor property).
Agent chat logs (`.copilot/history.json`, `.architect/history.json`) — ignore.

## Totals
- Live: 6 sites show it (5 real-estate = OK; **1 non-real-estate = aibizconnect.ca**, fix).
- Repo: 74 occurrences / 37 files → **5 files (aibizconnect-app-workspace) to fix**; the rest are
  real-estate (fine) or reference (keep).
