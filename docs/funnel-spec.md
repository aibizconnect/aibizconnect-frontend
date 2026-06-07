# Funnel Builder — Architecture (Supervisor + Copilot converged)

Status: ratified in deliberation 2026-06-01. Defers to SHARED_SPEC.md.

## 8 decisions
1. **Where funnels live:** under **Sites → Funnels** (not Marketing/Automation). Funnels
   are pages/steps/layouts/flows — they belong with websites.
2. **Architecture:** funnel steps are **real pages** — each has its own URL, optional SEO,
   publish state, critic score, draft/live version. (Reuse `website_pages`.)
3. **Visual canvas:** nodes = steps, edges = transitions; drag to reorder, click to edit;
   add upsells/downsells/thank-you; AI can generate whole funnels. ("funnel brain")
4. **Editor integration:** each step opens in the SAME editor as website pages — same
   components, tokens, saved assets, critic, publish model. Unified.
5. **AI funnel generation:** AI drafts full structure, step copy, layout, CTAs, forms,
   upsells, thank-you, + email/SMS follow-ups (DRAFT only) from industry / business type /
   services / location / brand / parent tenant. The "AI business engine."
6. **Safety:** draft only; no auto-publish; no auto-send; O-3 critic; G-approval;
   dry-run S-2; schema changes queued. Checkout steps NEVER auto-charge (S-1).
7. **Saved Assets integration:** funnels support Template / Global / Universal blocks —
   same reuse power as websites.
8. **v1 scope:**
   - **v1:** canvas with nodes · add/remove steps · connect steps · AI generates funnel ·
     edit steps in the page editor · publish steps individually.
   - **v2:** split tests, analytics per step, conditional paths, etc.

## Data model (QUEUED — supabase/QUEUED_funnels.sql; not applied)
- `website_funnels (id, tenant_id, website_id?, name, status, created_at, updated_at)`.
- `website_pages` gains: `funnel_id uuid null`, `funnel_step_type text`
  (landing|optin|sales|checkout|upsell|downsell|thankyou), `funnel_order int`.
  A page belongs to a website (normal) OR a funnel (a step) — same table, same editor.
- `website_funnel_edges (id, tenant_id, funnel_id, from_step uuid, to_step uuid, label)`
  — the canvas connections (transitions).

## Build order
1. Schema (queued) → apply on Ali's "Success".
2. Funnels list under Sites → Funnels + create funnel.
3. Canvas (nodes/edges) — start linear step-strip, then free canvas.
4. Step → opens existing editor (funnel_id context).
5. AI funnel generation (draft) from the tenant profile.
6. Publish per step (O-3 gate). v2: split tests/analytics.
