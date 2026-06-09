# Research: Using "Claude Design" (Anthropic Labs) in AIBizConnect

> Source: https://www.anthropic.com/news/claude-design-anthropic-labs (Anthropic Labs, "Claude Design", research preview, Apr 17 2026). Researched 2026-06-09.

## 1. What it is

**Claude Design** is Anthropic Labs' collaborative visual-creation tool (research preview;
Pro/Max/Team/Enterprise), powered by **Claude Opus 4.7** (their strongest vision model). You
converse with Claude to produce **designs, prototypes, slides, one-pagers, wireframes, landing
pages**.

Capabilities that matter to us:
- **Design-system aware**: on onboarding it **analyzes your codebase + design files** and auto-
  applies your brand **colors, typography, components** to everything it generates.
- **Multi-input**: text prompt, uploaded docs (DOCX/PPTX/XLSX), a referenced **codebase**, or
  **web-capture** (grab elements off a live site).
- **Live refinement**: inline comments, direct text editing, and **"adjustment knobs" for
  spacing, color, layout** in real time.
- **Export**: internal URL, folder, **Canva, PDF, PPTX, or standalone HTML/CSS**.
- **Handoff**: bundles a finished design for **Claude Code** to implement in one instruction.
- **Code-powered prototypes**: voice, video, shaders, 3D.

The underlying capability is reachable for developers via the **Claude API** + **Claude Agent
SDK** (`@anthropic-ai/claude-agent-sdk`, `ANTHROPIC_API_KEY`) — the consumer tool itself has no
public API today, but the model (Opus/Sonnet) and agent loop are API-accessible.

## 2. Why this is strategically important to us

Claude Design's core loop is **exactly the architecture we just shipped** (Phases 1–4):

| Claude Design | AIBizConnect equivalent (already built) |
|---|---|
| Reads repo → builds a **style guide** | `resolveBrandTokens` → `--abc-*` design tokens (Phase 1) |
| Generates UI that **respects the system** | recipes + `composeSection` emit token-driven sections (Phase 3) |
| **Adjustment knobs** (spacing/color/layout) | right-panel inspector (Styles/General groups) |
| **Web-capture** input | wizard "analyze existing site" extraction |
| **Export to HTML** | our pages already render to HTML; importer round-trips |
| **Handoff to Claude Code** | our editor = the implementation surface |

So this validates our direction. The opportunity is to (a) borrow its best UX, and (b) use
the Claude **model** where it beats our current free-Gemini path on *design* quality.

## 3. Three ways to use it — concrete

### Tier A — As an internal team tool (zero code, immediate)
Use Claude Design to design AIBizConnect's **own** assets and template library:
- Author new **prebuilt sections / page archetypes** visually, **export HTML**, then port into
  `lib/sections/prebuilt-templates.ts` / `layout-recipes.ts` (or via our HTML importer).
- Produce marketing one-pagers, pitch decks, onboarding screens.
- *Payoff:* faster, higher-craft template production than hand-authoring. No platform change.

### Tier B — Parity patterns to adopt in our builder (product features)
Lift the UX ideas that users will love:
1. **Live "adjustment knobs"** — sliders for spacing/radius/color *scale* that nudge the token
   values (`--abc-space-*`, `--abc-radius`) globally, not per-element. High-impact, low-risk.
2. **Web-capture → tokens** — let a tenant paste a URL and we extract a style guide (we already
   extract images/copy; add **token extraction**: dominant colors → palette, fonts → pairing).
3. **Multi-format export** — we have Canva MCP connected; add **"Export page → PDF/PPTX/Canva"**
   and **standalone HTML** download from the editor.
4. **"Design handoff"** — a one-click "send this draft to the AI to refine section X" loop.

### Tier C — Claude model/Agent-SDK in our generation pipeline (engineering)
Today `fillSlots` and image gen are **Gemini-first** (free). Claude is materially stronger at
*design + frontend reasoning*. Options, all behind a flag so Gemini stays the free default:
1. **Claude as the design generator**: add an `ANTHROPIC_API_KEY` path to `fillSlots` /
   a new `generateRecipeLayout` so premium tenants get Claude-authored section *structure +
   copy* (not just slot text). Keep Gemini as the free tier.
2. **Brand-token extraction agent**: a small Claude call that, given a captured site's
   HTML/screenshot, returns a `BrandTokens` JSON (colors/type/spacing) — feeds Phase-1
   `resolveBrandTokens`. This is the "analyze your codebase/design" feature, scoped to one site.
3. **Agent SDK "site builder" agent** (bigger): an autonomous loop — capture site → build
   tokens → pick archetypes → fill recipes → write draft pages — using the Agent SDK's
   gather→act→verify loop. This is essentially our wizard re-expressed as a Claude agent; worth
   a spike, but our deterministic pipeline is cheaper and already works.

## 4. Cost / policy guardrails (must respect)
- **Gemini-first stays the free default.** Any Claude path is opt-in / metered (mirror the
  `imageGenEnabled` / `AI_IMAGE_GEN_ENABLED` split: free runs always, paid is gated).
- **Drafts-only**, **(tenant_id, website_id) scoped**, Supervisor verification gates — unchanged.
- Meter Claude usage via `recordAiUsage` (`kind: "claude_design"` / `"section_generation"`).
- No auto-publish / auto-charge.

## 5. Recommended next steps (cheapest → boldest)
1. **(A) Now, no code:** use Claude Design to author 6–10 premium recipes/archetypes; export
   HTML; import. Immediate template-quality lift.
2. **(B) Quick win:** add live **token adjustment knobs** to the editor (spacing/radius/color
   scale) — pure front-end on the tokens we already emit.
3. **(B) Quick win:** **URL → BrandTokens** extraction in the wizard (dominant colors + fonts).
4. **(C) Spike, flagged:** add a Claude path to `fillSlots`/recipe generation behind
   `ANTHROPIC_API_KEY`, premium-tier only; A/B against Gemini output.
5. **(C) Later:** evaluate an Agent-SDK site-builder agent vs. our deterministic pipeline.

## Sources
- https://www.anthropic.com/news/claude-design-anthropic-labs
- https://www.developersdigest.tech/blog/claude-design-developer-guide
- https://code.claude.com/docs/en/agent-sdk/overview
- https://platform.claude.com/docs/en/home
