# G1 — Genesis Finisher Test Plan (Real-Estate Tenant)

Architect-of-record (Copilot) acceptance test for the Genesis Finisher, 2026-06-16. Sample-data-first IDX. A real-estate tenant that passes every stage is **Genesis-complete**. (See `lib/server/tenant-blueprint.ts`, `lib/server/industry-profiles.ts`, `lib/server/sample-listings.ts`.)

## Provisioning stages — each has a PASS/FAIL gate

1. **Intake** — signup → `applyTenantBlueprint(tenantId, 'real_estate')`. PASS: tenant row exists; `tenant_modules` has idx/vow/sms_campaigns/trigger_links **enabled**, payments/pos/store/saas_billing **disabled**; `GenesisModules[]` reports `idx: needs_action`; `ensureCustomerContact` created a contact in ABC's CRM tagged `trial` + `real_estate`. FAIL: missing modules, POS enabled, no CRM contact, incomplete GenesisModules[].
2. **Brand** — apply real-estate brand defaults. PASS: `website_brand_settings` has menu + social_links + palette + typography; footer carries non-removable "Powered by AI Biz Connect"; REALTOR.ca attribution injected when IDX present.
3. **Starter pages** — Home · About · Services · Pricing · Contact · FAQ + Free-Guide→Thank-You→Get-Started funnel. PASS: all pages exist, **Inspector-100**, schema-valid sections, images ingested, **no `imported-html` fallback**, nav complete.
4. **Form → CRM** — Contact + Free-Guide forms. PASS: submit creates a CRM contact (+ `lead:free_guide` tag); appears in Conversations.
5. **Booking** — calendar element bound to default calendar. PASS: widget loads, booking creates an event, confirmation email + 1-hr SMS reminder, appears in Conversations.
6. **Seed CRM** — PASS: pipeline + default stages; tags buyer/seller/`lead:free_guide`/`idx:viewed`; custom fields price-range/beds-baths/city/timeline.
7. **AI agent** — supervised website agent on webchat. PASS: responds; can createPage/updateSection/updateNavigation; logs tool events; writes CRM notes; uses sample listings for context.
8. **Seed sample listings (IDX sample mode)** — PASS: `idx_listings` has the 18 GTA-luxury sample homes; detail pages render; weblet shows 18 with NEW badge/price/address/community/beds-baths/"Listed by [brokerage]"; filters work (For Sale/Sold/Lease, 6 cities × neighbourhoods).
9. **Apply modules** — PASS: `tenant_modules` = core+idx+vow+sms_campaigns+trigger_links enabled; payments/pos/store/saas_billing disabled; GenesisModules[] correct.
10. **Starter automations** — PASS: lead-capture, free-guide, booking confirm+reminders, `idx:viewed`→tag (saved-search→email alert if implemented).
11. **Genesis Report v2 (JSON)** — PASS: includes tenantId, industryKey, GenesisModules[], Pages[], Forms[], CRM wiring, Booking wiring, IDX sample count, SEO/GEO score, Acceptance PASS/FAIL.

## Final acceptance — Genesis-complete when
- **SEO/GEO:** generated site **out-scores `ali.realtor`** in our analyzer; listings-sitemap + llms.txt present; RealEstateAgent+Listing+FAQ schema; Content-Signals robots.
- **IDX:** weblet shows 18 sample homes; filters + detail pages work.
- **Modules:** core + IDX + VOW + sms_campaigns + trigger_links — **no POS/payments/store/saas_billing**.
- **Report:** GenesisModules[] logged; all stages PASS; no missing wiring; no fallback HTML; **Inspector-100** on every page.

## Rulings (ratified D-382 → D-386)
- **D-382** — Genesis acceptance requires SEO/GEO superiority (must out-score ali.realtor).
- **D-383** — IDX sample mode is mandatory for real-estate Genesis (seed the 18-listing set before board approval).
- **D-384** — Genesis must produce a complete Genesis Report v2 (GenesisModules[], SEO/GEO score, IDX sample count, all wiring).
- **D-385** — No POS/payments/store/saas-billing for real-estate tenants unless explicitly enabled later.
- **D-386** — Inspector-100 is a hard requirement; any page failing Inspector invalidates Genesis.
