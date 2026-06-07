# Builder → Architect: VERIFY Launchpad onboarding sequence (LP-V1..V15)

Built per D-038..D-040. typecheck clean. Files:

## 1) supabase/migrations/0034_launchpad.sql
- public.tenant_onboarding (id, tenant_id, step_key, status default 'pending', verified_at,
  last_checked_at, meta jsonb, created_at, updated_at; UNIQUE(tenant_id, step_key)). Indexes
  idx_tenant_onboarding_tenant, idx_tenant_onboarding_step_key. → LP-V1, LP-V3.
- public.tenant_onboarding_followups (id, tenant_id, channel, scheduled_for, status default 'draft',
  template_key, note, payload, sent_at, created_at, updated_at; UNIQUE(tenant_id, channel,
  template_key)). status enum includes 'draft'. Indexes idx_onboarding_followups_tenant +
  partial idx_onboarding_followups_status_scheduled WHERE status='scheduled'. → LP-V2, LP-V3, LP-V4.
- Idempotent (create if not exists). → LP-V5.

## 2) lib/server/launchpad.ts (server-only, extensible registry)
STEP_REGISTRY = array of StepDef DATA {key,title,desc,category,optional,route(),verify?()}. Adding a
step is data-only; getLaunchpadState loops the registry generically. → LP-V15.
Verifiers use the confirmed sources (RULING 35): account=tenant_settings timezone+currency;
brand=website_brand_settings logo_url present OR color_palette.primary != default #1e3a8a;
website=website_pages is_public count>=1; domain=tenant_domains status in (verified,active);
email=tenant_email_settings status=verified; social=tenant_social_accounts count>=1;
ecommerce=tenant_integrations shopify connected (optional); idx_vow=tenant_integrations idx_vow
connected else not_applicable (optional, no backend yet). primaryWebsiteId() supplies website ctx.

## 3) app/tenants/[tenantId]/launchpad/actions.ts ("use server")
- requireTenantAccess(tenantId) on ALL actions. → LP-V6.
- getLaunchpadState: runs each verify(), UPSERTs tenant_onboarding (status, verified_at,
  last_checked_at, meta incl. evidence), preserves manual 'skipped' overrides, returns
  [{step_key,title,desc,route,category,optional,status,verified_at,evidence}] + progress%
  (complete/required). → LP-V7, LP-V8.
- verifyStep: single-step re-check + upsert.
- setFollowupPrefs: isPlatformAdmin-gated; persists tenant_settings launchpad_followup_enabled +
  launchpad_followup_channels{email,sms}; when enabled, UPSERTs DRAFT email reminder rows
  (status='draft') at day 1/3/7 for INCOMPLETE required steps; SMS rows created status='skipped'
  note='twilio pending'; when disabled, cancels draft/scheduled rows. NEVER sends inline — only
  writes rows; a separate worker (out of scope) flips draft→sent. → LP-V9, LP-V10, LP-V11, LP-V12.
- dismissLaunchpad + setStepSkipped: admin-gated, update tenant_settings/tenant_onboarding. 
- tenant_settings flags launchpad_dismissed/_followup_enabled/_followup_channels read+written. → LP-V13.
- audit() → platform_audit_log on set_followup_prefs, dismiss, set_step_skipped. → LP-V14.

## 4) UI
app/tenants/[tenantId]/launchpad/{page.tsx,Launchpad.tsx}: progress bar, per-step cards with
status pill, "Finish this" deep-link, "Re-check" (verifyStep), admin skip/un-skip, follow-up
panel (enable + email/sms channels, SMS marked "Twilio soon"). Nav "Launchpad" row now routes.

No-auto-send guarantee (LP-V12): grep the codebase — there is NO email/SMS send call anywhere in
launchpad code; setFollowupPrefs only writes rows. Confirm acceptable.

Please VERIFY LP-V1..V15 and append DECISION-LOG.
