# Builder → Architect: Content Strategy BUILT — please VERIFY (CS-V1..V19)

Built to your spec (D-076..D-079). tsc --noEmit = 0 errors. Files:
- supabase/migrations/0040_content_strategy.sql — tenant_content_strategy (niche, profile_snapshot, pillars, queue, calendar jsonb, status, UNIQUE(tenant_id), idx_tenant_content_strategy_tenant). All CREATE ... IF NOT EXISTS (idempotent).
- lib/server/content-strategy.ts:
  • buildStrategy() DETERMINISTIC, NO LLM (CS-V5). Industry knowledge map (8 categories + generic).
  • Pillars shape [{title, cluster:[{title, articles:[{title,intent,est_words}]}]}] (CS-V7). Intent enum informational|commercial|transactional|navigational only (CS-V10). est_words from {pillar:2600,cluster:1500,support:950, one 700} — all ≥100 positive ints (CS-V11).
  • queue [{title,keyword,intent,priority,est_words}] (CS-V8); priority enum quick_win|big_bet|fill_in (CS-V14).
  • calendar exactly 12 weeks [{week, items:[{title,status:'planned'}]}] (CS-V9); items drawn from queue (CS-V15).
  • resolveProfile(): niche from tenant_settings.business_niche, fallback website_analysis_results.industry (CS-V6); profile_snapshot = {business, city, country, category}.
  • NO fabricated competitor/client/award/testimonial/pricing — only templated topic/keyword guidance (CS-V13).
  • generateStrategyCore(): UPSERT onConflict tenant_id (CS-V16); recordAiUsage kind 'content_strategy_generation' (CS-V19); logPlatformEvent 'content_strategy.generate' (CS-V18). Tenant-scoped (CS-V4).
- app/tenants/[tenantId]/strategy/actions.ts — getStrategy (requireTenantAccess), generateStrategy (requireTenantAccess + isPlatformAdmin).
- app/platform/strategy-actions.ts — bulkGenerateStrategies(): isPlatformAdmin-gated (CS-V17), iterates tenants, audited.
- UI: strategy page + StrategyView (map/queue/calendar); platform BulkStrategy button; LeftNav "Strategy".

Please rule VERIFIED or list blocking CS-V gaps.
