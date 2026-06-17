# SEO/GEO Nurture Email Series — PLAN (deferred, build later)

A native replacement for the GHL "**Your SEO + AI Visibility Report is Ready**" email chain (currently sent from `abc.aibizconnect.ca` via GoHighLevel). Ali's requirements + the source content are captured here so we can build it when we return to it.

## Requirements (Ali, 2026-06-17)
- **Clients get a recurring series — one per domain they check** (that's desired; keep it).
- **ABC admins/staff must NOT receive it** (the bug today: `admin@aibizconnect.ca` gets spammed every check). Auto-exclude anyone with a platform role / `@aibizconnect.*` staff address.
- **In-tool toggle** in the SEO/GEO analyzer to turn the series off for internal/admin runs.
- Send via our **own** email infra (Resend, per `lib/server/email-send.ts`) — NOT GHL.

## Why native now
GHL expires **~2026-06-20**. The legacy chain (and the spam) dies with it. ⚠️ If we want the EXACT GHL email bodies, export them from GHL BEFORE June 20 — they are not in this repo.

## Source content (we already have it)
1. **Analyzer task list** — `public/tools/seo-geo-analyzer.html` (frozen; the `TASKS` array). The per-fix titles + descriptions + step-by-step instructions are the body copy for the series. Categories + headline tasks:
   - **Technical SEO:** Page Title, Meta Description, robots.txt, Unblock crawlers (noindex), Crawlable links, Schema.org structured data, Canonical URL, HTTPS/SSL, Mobile viewport, hreflang.
   - **Content SEO:** Image alt text, Heading structure (H1→H2→H3), Anchor text.
   - **GEO / AI visibility:** Schema for AI discoverability, FAQ + FAQPage schema, E-E-A-T signals, Page speed for AI crawlers, Last-updated/freshness, **Allow AI crawlers in robots.txt**, **Publish `llms.txt`**.
2. **`docs/SEO-GEO-SPEC.md`** — the 6 pillars to beat ali.realtor (overall strategy + structured-data/llms.txt/Content-Signals robots).

## Suggested chain (5–6 emails, authored from the above)
1. **"Your SEO + AI Visibility Report is ready"** — the score + top 3 fixes (the report).
2. **Foundations** — title/meta/robots/HTTPS/viewport (the quick technical wins).
3. **Get found by AI** — schema, FAQPage, llms.txt, allow AI crawlers (GEO pillar).
4. **Trust & authority** — E-E-A-T signals, freshness, anchor text.
5. **Performance** — page speed for users + AI crawlers.
6. **Re-score + CTA** — "run it again, see your gains" → book a call / upgrade.

## Build outline (contained — does NOT need the full gated automations engine)
- `seo_report_enrollments` table: `{contact/email, domain, tenant_id, step_idx, next_send_at, status, source}` — one enrollment per (client, domain).
- Enrollment trigger: on a client domain-check (or on becoming a client). Skip when the requester is an ABC admin/staff OR the in-tool toggle is off.
- Sender: a cron route (like `app/api/cron/*`) that sends the next due step per enrollment via `sendEmail` (Resend), advances `step_idx`/`next_send_at`, one-click unsubscribe.
- In-tool toggle: add to the analyzer (locked file — Ali authorized changes when we build this) so internal runs don't enroll.

> Status: **DEFERRED** — captured 2026-06-17 at Ali's direction ("keep it to build a series later"). Resume after the aibizconnect.app wiring.
