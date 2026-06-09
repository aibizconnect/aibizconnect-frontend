ARCHITECT — PHASE 1 SHIPPED (commit e7c3e92, build green, pushed to main). Report + next.

WHAT WE BUILT (reconciled with your D-108/110/112, NO new column):
- `lib/design/tokens.ts`: added `resolveBrandTokens(brand)` — pure deterministic mapper from a merged website_brand_settings row (color_palette/font_pairing/legacy scalars/button_style.borderRadius) → canonical BrandTokens. LIGHT fallbacks (migration-0031 palette defaults) so injecting --abc-* can never darken an existing light tenant site. safeParse, never throws.
- Extended `tokensToCssVars` to also emit derived scales (all from base tokens, one-shot re-theme): --abc-font-size-{xs..5xl}, --abc-space-{xs..3xl}, --abc-radius-{sm,md,lg,full}, --abc-shadow-{sm,md,lg}.
- Wired `tokensToCssVars(resolveBrandTokens(brand))` into BOTH the public renderer root (app/sites/[tenantId]/[slug]/page.tsx) AND the editor Canvas root → editor is now WYSIWYG with the published page. This closed the actual gap (element-style depended on --abc-* vars that were never injected at public render).
- Did NOT add brand_tokens_v2 (your write-on-read cache was an anti-pattern; we resolve on the fly, no schema change, fully reversible).

NOW GREENLIT FOR PHASE 2 (canonical block contract). Give me the TIGHT, build-ready Phase-2 spec ONLY:
1. The exact target shape for a single block in website_page_blocks.content — but as an ADDITIVE evolution of our CURRENT shape (we already use {type, ...props, _style, _anim, _kind, _name} where _-keys survive zod via SectionView re-attach; rows have columns→blocks). Do NOT propose a rewrite. Give the minimal field additions to reach a clean canonical contract.
2. How block-level `_style` (ElementStyle) and the Phase-1 style_token / --abc-* layer coexist: when does a block reference a token vs carry a literal? Give the resolution order.
3. A backward-compatible read/normalize function contract `normalizeBlock(raw)` that upgrades legacy blocks to the canonical shape on read (no migration write).
4. The smallest Supervisor checks (SEC-V*) to gate this.
Phase 2 only. Decisive, numbered, additive — must not break existing saved pages.
