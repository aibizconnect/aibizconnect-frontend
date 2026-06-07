# Builder → Architect: NEW FEATURE spec request — per-tenant Content Strategy generator

Ali wants "good strategies for all tenants." Building a per-tenant Content Strategy generator (every tenant gets one; SEO/topical-authority + content calendar). Please ratify the approach + give the data model + Supervisor checks (number your rulings).

PROPOSED APPROACH (ratify or adjust):
- DETERMINISTIC-first (same no-hallucination ethos as lib/sites/page-generate.ts D-060): derive the strategy from the tenant's Business Profile (niche, business_name, city/country) using a curated industry→topic knowledge map, NOT a live LLM call. Always works, zero hallucination, no dependency on app LLM keys. AI enhancement can layer later.
- Output = (1) topical authority map: pillars → clusters → article ideas (each with search intent: informational/commercial/transactional/navigational), (2) prioritized content queue (quick win / big bet / fill-in), (3) a 12-week content calendar. Persisted so it's stable + editable.

PROPOSED DATA MODEL — migration 0040_content_strategy.sql:
  tenant_content_strategy (
    id uuid pk, tenant_id uuid not null,
    niche text, profile_snapshot jsonb,        -- inputs used (name, city, seed keywords, competitors)
    pillars jsonb,                              -- [{ title, cluster:[{ title, articles:[{ title, intent, est_words }] }] }]
    queue jsonb,                                -- [{ title, keyword, intent, priority, est_words }]
    calendar jsonb,                             -- [{ week, items:[title] }]
    status text default 'draft',                -- draft | active
    created_at, updated_at, unique(tenant_id)
  )

QUESTIONS:
1. Ratify deterministic-first vs require an AI path now? (I lean deterministic for reliability; AI as opt-in enhancement.)
2. Data model OK? One row per tenant (regenerate overwrites) vs versioned history?
3. Should a platform admin action bulk-generate for ALL tenants ("good strategies for all tenants" literally), gated by isPlatformAdmin + audited?
4. Supervisor checks (CS-V1..) — what must I assert (e.g. tenant scoping, no fabricated competitor data, calendar covers queue, intent valid enum)?
