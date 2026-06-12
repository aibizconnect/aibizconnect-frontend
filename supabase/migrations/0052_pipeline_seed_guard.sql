-- 0052 (D-269): guard the DEFAULT pipeline seed against concurrent-creation races.
-- ensurePipeline()'s check-then-insert raced itself into 1,000 duplicate "Sales Pipeline"
-- rows on one tenant (June 1 burst, since cleaned). The partial unique index makes the
-- seed idempotent at the database level while leaving user-named pipelines unrestricted.
-- Code (lib/crm.ts ensurePipeline) already re-selects the winner on insert failure.
create unique index if not exists tenant_pipelines_default_seed_uidx
  on tenant_pipelines (tenant_id)
  where name = 'Sales Pipeline';
