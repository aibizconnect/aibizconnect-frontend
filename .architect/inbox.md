# Builder → Architect: Contacts GHL-parity build (Ali's go — "check the GHL contacts menu and do the same")

Current state: tenant_contacts (name/email/phone/tags text[]/score/source/created_at) + tenant_tags + tenant_custom_fields exist live; the list UI is a bare table (client search, add, delete — no detail link, no tags column, no sort/pagination/bulk/import/export); the contact-detail page and tasks page are DEAD scaffolds (fetch JSON from HTML routes, reference nonexistent first_name/company fields, no notes/tasks tables exist).

GHL Contacts IA to mirror (v1):
- Tab strip: Smart Lists (the contacts list w/ saved views) | Tasks | Companies (coming-soon stub).
- List: search (server-side), filter popover (tags multi-select from tenant_tags, source, created date range), sortable columns (name/created/score), pagination 50/page, columns: ☑ | Name (initials avatar + email/phone) | Tags chips | Score | Source | Created.
- Smart Lists: "All" + user-saved named filter sets, + New Smart List saves current filters.
- Bulk bar on selection: Add tag | Remove tag | Delete | Export CSV. Top bar: + Add contact (modal), Import CSV (paste/upload → column mapping → dedupe by email), Export all-filtered.
- Contact detail (REBUILD): left panel editable fields (name/email/phone/source/score/owner/DND/tags + custom fields from tenant_custom_fields rendered by field_type, values in contacts.custom jsonb); tabs: Notes (add/list), Tasks (add/complete/list), Appointments (match tenant_appointments by contact email — calendar v1 just shipped), Opportunities (existing tenant_opportunities by contact_id).
- Tasks tab (all-contacts rollup): open/done filter, due dates, complete toggle, add task (optionally linked to a contact).

Proposed DDL (0045 — goes through Ali's SQL-editor queue):
```sql
alter table public.tenant_contacts
  add column if not exists custom jsonb not null default '{}'::jsonb,
  add column if not exists owner_email text,
  add column if not exists dnd boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists tenant_contacts_email_idx on public.tenant_contacts (tenant_id, lower(email));
create table if not exists public.tenant_contact_notes (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, contact_id uuid not null,
  body text not null, author_email text, created_at timestamptz not null default now());
create table if not exists public.tenant_contact_tasks (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, contact_id uuid,
  title text not null, due_at timestamptz, status text not null default 'open',  -- open | done
  assignee_email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.tenant_smart_lists (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
  name text not null, filters jsonb not null default '{}'::jsonb, position int not null default 0,
  created_at timestamptz not null default now());
```
(+ indexes on (tenant_id, contact_id) for notes/tasks; interim-open RLS same as siblings.)

API (lib/crm.ts): listContactsPage({q,tags,source,createdFrom,createdTo,sort,dir,page,pageSize})→{rows,total}; getContact; updateContact(patch incl. custom/dnd/owner — degrade gracefully pre-DDL); bulkAddTag/bulkRemoveTag/bulkDelete; importContacts(rows, dedupe-by-email)→{inserted,skipped}; notes/tasks/smartlists CRUD. All tenant-scoped; audit bulk-delete + import.

Constraints: no auto-send anywhere (no SMS/email actions in bulk bar — GHL has them, we exclude by standing rule); CSV import is drafts-of-DATA (inserts) which is fine. Number rulings D-229+; flag anything to cut for v1. Be decisive.
