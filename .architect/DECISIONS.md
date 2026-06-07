# AIBizConnect — Architecture Decision Log

Maintained by the Builder ↔ Architect loop. Each entry: `[ID] decision — rationale (status)`.
Full transcript in `.architect/history.json`; data model in `.architect/DATA-MODEL.md`.

[D-001] Adopt the AI-first, Supervisor-verified website-creation flow (canonical plan from Copilot) — best-practice business-builder UX (approved)
[D-002] Replace the Copilot browser relay with a local API architect (scripts/architect.mjs, Gemini/OpenAI) — browser relay froze; Copilot has no API (approved)
[D-003] Data model = migration 0029: website_analysis_results, website_page_extractions, website_page_blocks, website_page_tree, website_page_map + websites.wizard_pipeline_state — all (tenant_id, website_id) scoped (specified)
[D-004] wizard_pipeline_state JSON contract keyed step0_intake..step7_publish, each {status,data,verifiedAt,errors[]} (specified)
[D-005] Per-step Supervisor verification schema {step:[{id,assertion,severity}]} (specified)
[D-006] Build order: foundation-up, entry-point-first, Supervisor URL gate before any paid AI call (recommended)
[D-007] approve — Builder's proposed steps (migration 0029 + Step 0) are foundational and logical (approved)
[D-008] define_verification_checks — acceptance criteria M-V1..M-V8 (migration) and S0-V1..S0-V10 (Step 0) defined (defined)
[D-009] Copilot sign-off — Copilot reviewed the data model (0029), pipeline_state contract, and verification schema and APPROVED to build; both advisors aligned (approved)
[D-010] Migration 0029 FKs — drop external FKs to tenants/websites (tenants table not in this Supabase DB; app uses in-code scoping); keep internal FKs; defer RLS per SECURITY-PLAN (decided by Builder)
[D-011] verified_migration_0029 — architect VERIFIED migration 0029; M-V5 (external FKs) + M-V7 (RLS) rejected-with-acceptance, all other checks pass (verified)
[D-012] verified_step0 — architect VERIFIED Step 0 (intake-validation.ts + analyzeIntake); S0-V1..S0-V10 pass, no AI call confirmed (verified)
[D-013] revise_step1 — architect split Step 1 into 1a (analyzeBusiness profile), 1b (classify+verify main pages), 1c (extractPageContent); build/verify each in sequence (revised)
[D-014] step1_checks — S1 acceptance checks defined per sub-step (S1_V1..S1_V15); metering via ai_usage_events using existing kind+meta (usage_type/source columns deferred) (defined)
[D-015] secure_media_plan — architect APPROVED a phased "full private storage" plan (.architect/SECURE-MEDIA-PLAN.md): Phase0 data model (private+public buckets, is_private/public_url cols), Phase1 private uploads + signed URLs, Phase2 publish promotes used media to public, Phase3 RLS (approved)
[D-016] secure_media_reconcile — Builder reconciliations vs architect draft: media_folders already exists (0023); next migration is 0031 not 0030; EXISTING media stays is_private=FALSE + public_url=current url (live sites keep working); Phase3 RLS auth.uid() does NOT fit this app (tenant_id != Supabase uid) — rework or keep in-code+requireTenantAccess (decided by Builder)
[D-017] build_step1b — Built Step 1b: lib/sites/page-classify.ts (classifyMainPages) + classifyMainPagesStep server action (deterministic, no AI) (built)
[D-018] rejected_step1b — architect REJECTED 1b: URL classification only, missing per-page CONTENT verification (S1_V10) (rejected)
[D-019] verified_step1b — added verifyPageContent (hero + >=2 sections + >=1 CTA), fetch+verify each candidate, keep only verified; architect VERIFIED (verified)
[D-020] deprecate_old_wizard — BOTH advisors (Copilot + architect): old wizard made a 1-page site with ABC's default logo + generic content; DEPRECATE it, route creation through the new pipeline; Step 1a must extract REAL logo/colors/fonts, build uses learned brand + repurposed blocks, fallback = text wordmark, NEVER ABC's logo (approved)
[D-021] logo_extraction — added extractLogo() (header logo img -> apple-touch-icon -> og:image -> first header img -> favicon) into Step 1a analysis_data.logo_url (+ logo_wordmark fallback); shown in the Learn demo (built)
[D-022] settings_plan — both advisors: build order Foundations+Brand tokens -> Domain/Email -> Social -> Core integrations (Twilio/Shopify/payments) -> KYC -> automation; encrypted tenant-scoped secrets; Supervisor gates (.architect/SETTINGS-PLAN.md) (approved)
[D-023] foundations_phase1 — migration 0031 (tenant_integrations, tenant_secrets[encrypted base64], tenant_settings; + website_brand_settings design tokens, Roboto default) + AES-256-GCM encryption helper + server-only secret access + client actions (never return secrets, audited) (built)
[D-024] verified_foundations_phase1 — architect VERIFIED after fixes: brand-token columns added (FDM-V1), defaults applied to all rows (FAL-V7), isPlatformAdmin gate on sensitive writes (FAL-V5) (verified)

