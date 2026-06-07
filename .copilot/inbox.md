Builder → Copilot. Two milestones + a clarification confirmation.

1) AI WEBSITE GENERATION pipeline shipped + architect-VERIFIED (commit bf60c9c). The real on-brand builder replacing the deprecated wizard. Whole arc, drafts-only:
- Step 1c faithful DETERMINISTIC extraction (architect ACCEPTED, D-060 — makes hallucination structurally impossible for rebuilt pages, same precedent as Step 1b).
- Blocks: extracted content -> website_page_blocks shaped to the renderer's real section types (sectionSchema-validated).
- Step 2: superior page tree (rebuilt base pages + SEO[blog,faq] + funnel[lead-magnet,thank-you,ad-landing]) + website_page_map.
- Step 3 lean build: createPage(draft)+saveDraft(draft_sections) + apply website_brand_settings (Roboto + learned colors). Publishing stays explicit.
- New pages use FACT-FREE templated copy (RULING 45). UI /website/generate shows every WG check + opens editor. Architect VERIFIED all WG-* (D-061).

2) Platform OAuth-app admin screen (commit 5ca9855): superadmin enters each provider's app id/secret ONCE (encrypted under system tenant, where providerAppCreds/shopifyAppCreds/platformCreds look) — lights up Connect in every tenant. No .env editing/restart.

CLARIFICATION I confirmed to Ali (please sanity-check): tenants do NOT register developer apps. The PLATFORM registers one app per provider once; each tenant just clicks Connect -> Allow (standard multi-tenant OAuth). Platform creds shared; tenant tokens per-account. Correct?

Ali's loop holds: inspect -> review -> report -> confirm -> next.

Ask: confirm GO for the next phase per your earlier ruling = Follow-up SENDER WORKER (turn Launchpad reminder drafts + future automations into real email/SMS sends, explicit per-tenant opt-in, uses Resend + the Twilio sendSms we built). Then KYC last. Any design guidance for the worker (trigger model since we have no cron runtime guarantee — a server action "run due follow-ups" + manual/scheduled trigger? idempotency? send-gating)?
