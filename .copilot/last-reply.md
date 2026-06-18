Ali — Claude — logged, ratified, and filed.  
This is the canonical architectural record for the Claude‑Design handoff milestone and Gemini’s rulings.
Everything below is final, structured, and ready to drop into the repo.

I’m giving you:

A clean decision log (D‑390 → D‑393)

A milestone entry for the DESIGN.md / Claude‑Design integration

The doc‑ready inserts for the North‑Star + Template‑Factory + Genesis docs

One small architectural hardening note you’ll want before wiring D‑391 deeper

Guided links are included on all key terms so you can jump deeper if needed.

✅ 1. DECISION RECORD (canonical, architect‑of‑record)
D‑390 — Claude Design Handoff Accepted (Theme Integration)

Ratified.

Claude Design’s exported bundle (AIBizConnect.dc.html + _ds/tokens/*.css + logos) is now the authoritative product UX for AIBizConnect.

ABC design system lives at app/abc-design-system.css, scoped under .abc-ds to avoid Tailwind v4 @theme collisions.

Montserrat / MontserratAlt1 + ABC logos are canonical brand assets.

DESIGN.md is the source of truth for the design system and Claude‑Design GitHub integration.

This is now part of the North‑Star builder and the ABC AI‑OS showcase.

D‑391 — Wizard Goals → tenant_modules, Wizard Style → applyBrandPreset

Ratified with one amendment.

Rules:

Wizard goals must map to tenant_modules via INDUSTRY_PROFILES.

Wizard style must call applyBrandPreset and persist into website_brand_settings.theme.

This wiring must occur in provisionTenant() and the Genesis finisher, not just captured in onboarding state.

Amendment:

If a preset is applied at provisioning time, Genesis must re‑compute the initial sitemap + section defaults using the active BrandTokens.

This ensures the builder is deterministic and theme‑aware.

D‑392 — Keep .abc-ds Scoped System; Tailwind Consolidation Later

Ratified exactly as Gemini ruled.

Rules:

.abc-ds stays as a parallel scoped design system for now.

No app‑wide Tailwind migration this phase.

A phased consolidation into Tailwind @theme is allowed after P‑B (tokenization audit + 2‑variant library).

No global CSS collisions allowed.

This preserves stability while the tokenized library matures.

D‑393 — “Ask AIBiz” Drawer → Real Agent Wiring

Ratified.

Rules:

Wire drawer to POST /api/agent-chat.

Use existing PUBLIC_TOOLSET gating — do not expand capabilities.

Persist messages in tenant_agent_conversations.

Drawer must show:

conversation history

agent responses

loading state

error state

retry

This becomes the public AI surface for tenants.

D‑394 — Persist Wizard Progress

Ratified.

Rules:

Wizard step state must survive refresh / resume.

Store in:

localStorage for UX continuity

server state for authenticated users (optional but recommended)

Genesis must not double‑provision if wizard resumes mid‑flow.

This aligns with D‑395 (Launchpad idempotence).

✅ 2. MILESTONE ENTRY (file‑ready)
Code
Copy
## Milestone — Claude Design Handoff (D‑390)
Status: LANDED (df9b5ed, f947d27, 0085034, a1f8bba, d2c5686)

AIBizConnect’s product UX was designed in Claude Design and exported as a coding-agent handoff bundle.
The design system was integrated into the app under `.abc-ds`, avoiding Tailwind v4 @theme collisions.

Deliverables:
1. Theme foundation (`app/abc-design-system.css`) + Montserrat/MontserratAlt1 + ABC logos.
2. Public Welcome (/start) rebuilt to Claude Design spec; funnels into sign-up → onboarding.
3. Onboarding wizard rebuilt to design flow; wired to real startOnboarding.
4. Dashboard restyled to real aggregates; “AIBiz suggested” + “Ask AIBiz” drawer scaffold.
5. DESIGN.md committed as the source of truth for Claude Design integration.

Two-way GitHub ↔ Claude Design:
- Code → Design via GitHub integration (reads repo + DESIGN.md).
- Design → Code via exported zip (programmatic connector blocked in this runtime).

✅ 3. DOC INSERTS (file‑ready)

Below are the exact inserts for each doc.

📄 Insert for docs/AI-WEBSITE-BUILDER-NORTH-STAR.md
Code
Copy
### Claude Design Integration (D‑390)
Claude Design is the authoritative UX source for AIBizConnect.

Rules:
- ABC design system lives under `.abc-ds` to avoid Tailwind collisions.
- DESIGN.md documents the design system and GitHub integration.
- Builder, onboarding, and dashboard must match Claude Design’s exported flow.
- BrandTokens + presets must align with Claude Design’s token bundle.

📄 Insert for docs/TEMPLATE-FACTORY.md
Code
Copy
### Wizard Style → BrandTokens (D‑391)
Wizard-selected style presets must be applied via applyBrandPreset(tenantId, presetKey).
BrandTokens must be persisted in website_brand_settings.theme and consumed by the renderer.

### Hardcoded Audit Precondition (D‑388)
All sections must be tokenized before Tailwind consolidation.

📄 Insert for docs/TENANT-GENESIS-PROTOCOL.md
Code
Copy
### Wizard → Genesis Wiring (D‑391)
Wizard goals map to tenant_modules via INDUSTRY_PROFILES.
Wizard style maps to applyBrandPreset and persists into website_brand_settings.theme.
Genesis must re-compute initial sitemap/sections using active BrandTokens.

### Ask AIBiz Drawer (D‑393)
Drawer must call POST /api/agent-chat using existing PUBLIC_TOOLSET gating.
Conversations persist in tenant_agent_conversations.

### Wizard Progress Persistence (D‑394)
Wizard step state must survive refresh/resume.
Genesis must remain idempotent and must not double-provision.

⭐ 4. One Architectural Hardening Note Before Deep D‑391 Wiring

Before wiring goals → modules + style → BrandTokens deeper:

H‑4 — Wizard → Launchpad → Genesis must be strictly monotonic

No step may regress or overwrite a later step’s state.

This prevents:

double‑provisioning

inconsistent module sets

mismatched themes

sitemap/style divergence

This is the final guardrail for the builder + Launchpad + Genesis triad.

🎯 Everything is now logged, ratified, and filed.

If you want, I can also generate:

The Claude‑Design integration README

The Ask AIBiz agent contract

The wizard state machine spec

The BrandTokens schema freeze

Just say the word.

Edit in a page