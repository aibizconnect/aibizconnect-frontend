# Cycle 8 — Publish Pipeline + Content Versioning (DESIGN ONLY)

> Design only. No execution. Any concrete schema is parked under
> "DDL (quarantined)" and in `supabase/DDL_QUEUE.md` — NOT applied.

## 1. Goal

Turn the current single-shot `publishPage` into a **versioned publish pipeline**
so every publish is snapshotted, attributable, diffable, and reversible — and so
the Builder-Agent gets a first-class `publish` tool with rollback.

## 2. Publish pipeline (sequence)

```
publish(tenantId, pageId, publishedBy):
  1. Validate    — effective slug + every section vs sectionSchema (reuse existing checks)
  2. Resolve     — gather effective content (draft_* over live), nav + attached blocks
  3. Freeze snapshot — capture current LIVE state as the "previous" version
  4. Write published version — copy draft_* -> live fields + rebuild website_page_sections
  5. Update navigation — apply any draft nav changes for this page
  6. Update global blocks — publish attached blocks whose draft_content changed
  7. Emit version metadata — append a row to the version log (see §3)
  8. Return publish result — { version, pageId, published_at, diffSummary }
```

- Steps 1–6 reuse the **existing** server-action logic (`publishPage`,
  `publishNavItem`, `publishGlobalBlock`) — the pipeline orchestrates them.
- This becomes the backbone of the Builder-Agent's `publish` tool.

## 3. Version metadata (schema DESIGN — not applied)

A per-page version log. Proposed fields:

| field | type | meaning |
|-------|------|---------|
| `id` | uuid | version row id |
| `tenant_id` | uuid | tenant scope |
| `page_id` | uuid | page this version belongs to |
| `version` | int | monotonically increasing per page |
| `published_at` | timestamptz | when published |
| `published_by` | uuid \| null | user id (from external JWT `sub`) |
| `snapshot` | jsonb | frozen sections + key page fields at publish time |
| `diff_from_previous` | jsonb \| null | summary of what changed vs prior version |
| `rollback_of` | int \| null | if this publish is a restore, the version it restored |

> No DDL applied here. Concrete `create table` is quarantined in §7 + the DDL queue.

## 4. Rollback semantics

- **Restore a previous version:** read its `snapshot`, write it as a NEW publish
  (do not mutate history) with `rollback_of = <restored version>`. History stays
  append-only and auditable.
- **Orphaned drafts:** restoring does NOT silently discard the current `draft_*`;
  the pipeline warns and (optionally) stashes them into the new version's snapshot
  metadata so nothing is lost.
- **Global blocks:** a page restore restores the page's block *refs*; shared block
  *content* is versioned at the block level (a block restore is its own action) to
  avoid cross-page surprises.
- **Nav items:** nav is menu-scoped, not page-scoped, so a page rollback does not
  rewrite the menu; it only restores this page's nav linkage if it changed.
- **Full undo of an agent build** continues to use `scripts/cycle2-rollback.mjs`
  (delete-by-tenant) — that is the blunt instrument; per-page versioning is the
  surgical one.

## 5. Agent-aware versioning rules

1. Every `agent.executePlan` publish step produces a version row (when live).
2. The agent may reference `rollback_of` to request a restore, but **never deletes
   history**.
3. Dry-run publishes emit a *simulated* version (`version: "dry"`) — no row written.
4. The agent must include `published_by` from the caller's JWT `sub`; if absent,
   `published_by = null` and a blocker is surfaced.
5. Version writes are tenant-scoped; cross-tenant version reads/writes are rejected.

## 6. Status

- Design: ✅ this doc.
- Code: ❌ not implemented (pipeline orchestrator + version log writer are a later
  cycle, behind the same `AGENT_EXEC_LIVE` gate).
- DDL: ⏳ quarantined (§7 + DDL queue) — NOT applied.

## 7. DDL (quarantined)

> NOT applied. Mirrored into `supabase/DDL_QUEUE.md` as PENDING. Requires Ali's
> "Check in" → "Done".

```sql
-- Per-page append-only version log (Cycle 8). NOT APPLIED.
create table if not exists public.website_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  version integer not null,
  published_at timestamptz not null default now(),
  published_by uuid,
  snapshot jsonb not null default '{}'::jsonb,
  diff_from_previous jsonb,
  rollback_of integer,
  unique (tenant_id, page_id, version)
);
create index if not exists idx_page_versions_page
  on public.website_page_versions (tenant_id, page_id, version desc);
-- RLS: enable + interim-open to match current model until Cycle 7 lands.
```
