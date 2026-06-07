# REPORT — "The AI-generated page is one big black box, nothing is editable"

**For:** Copilot (architect) + Ali
**From:** Claude (builder)
**Date:** 2026-06-02
**Severity:** Blocker — this decides whether the builder is viable or we switch to GHL.

---

## 1. Symptom (Ali's exact words)

> "The Hero is one whole element, and I have no access to any of its components on the
> right column. That is the theme for all other components on the page — the whole thing
> is not editable, and I can't drag and drop or change any properties of any elements!!!"

Plus an IA complaint: clicking **Sites** → a Websites list (`/site`), **Edit** → a near-identical
"Your Website" page (`/website`), **Edit again** → the actual builder. Two redundant hops.

---

## 2. Root cause (confirmed in code, not a guess)

`app/tenants/[tenantId]/website/editor/Canvas.tsx`, render loop (~line 683):

```tsx
{item.content.type === "row" ? (
    <RowEditor ... />          // FULLY editable: columns, per-child select, drag-drop, inspector
) : (
    <SectionView content={item.content} theme={theme} />   // READ-ONLY composite render
)}
```

- **`row`** blocks go through `RowEditor` → Section→Row→Column→Element. Every child is
  individually selectable, draggable, and editable (the nested-editing work we shipped).
- **Every other type** (`hero`, `features`, `cta`, `testimonials`, …) is rendered by a
  single composite React component (`HeroSection.tsx`, `FeaturesSection.tsx`, …) via
  `SectionView`. The component's internal headline/image/button are **JSX, not nodes** —
  there is nothing for the editor to select, drag, or inspect. Clicking it only opens the
  composite's top-level fields (heading/subheading/CTA text).

**And the AI generator emits only composite types** (`generateSectionAI` / the website
generation path produce `{type:"hero", …}`, `{type:"features", …}`, etc.). So a generated
page is 100% composites → 100% black boxes. The recent "premium" redesign made these
composites richer/prettier, which made them *more* monolithic, not less.

This is **by design of the current model**, not a stray bug. GHL/Wix/Webflow never have
this problem because their pages are *always* primitives (row/column/text/image/button);
they have no monolithic "hero" type.

---

## 3. The fork — two ways out

### Option A — Keep composites, bolt on "inner editing"
Add an overlay so clicking inside a `HeroSection` selects its headline/image/button.
- Requires hand-writing selection/drag handles **inside every composite renderer**, and a
  per-composite schema describing its editable sub-parts.
- Fragile, renderer-specific, N× maintenance (one mapping per section type), and still
  can't let users *add* a 2nd button or *reorder* pieces the renderer didn't anticipate.
- Essentially re-implementing a page builder inside each component. **Not recommended.**

### Option B — Decompose on generate (the GHL model)  ✅ recommended
Sections become **presets that expand into editable primitives**. The "hero" preset emits:

```
Section
└─ Row [2 cols, 55/45]
   ├─ Column → [ heading(el), subheading(el), button(el)×2, trust-row(el) ]
   └─ Column → [ image(el)  ]   ← the dashboard mock becomes a real image element
```

- Every piece is a primitive node → **already editable today** (RowEditor + inspector +
  drag-drop all work on these right now).
- The premium look is preserved via element `_style` + a styled row/column, not via a
  monolithic component.
- The AST + `ast-ops.ts` we already built is exactly the substrate for this.
- One-time cost: write ~8 "preset → AST" expanders (hero, features, cta, testimonials,
  pricing, faq, contact, footer) + repoint the AI generator to emit presets, not composites.
- Composite renderers don't get deleted — they become the **preview thumbnails** for the
  preset picker, and a fallback renderer for any legacy composite still in a draft.

**Migration for existing generated pages:** a "Convert to editable" action (and an
auto-convert on open) that runs each composite through its expander → primitives. Lossless,
because the expander produces the same visual output from real elements.

---

## 4. Routing / IA (secondary, task #6)

`/site` (Websites list) and `/website` ("Your Website", near-identical) are two layers that
look the same and both have **Edit**. Collapse to one: **Sites → page card → Edit → builder.**
Drop the middle `/website` mirror or make it the builder directly.

---

## 5. Questions for Copilot

1. Confirm **Option B** (decompose-on-generate) over Option A. Any objection given the
   strict-finite Section→Row→Column→Element spec we ratified?
2. Preset registry shape: where do the 8 expanders live, and do presets carry a
   `presetId` on the Section so we can offer "reset to preset" later?
3. Auto-convert legacy composites on open vs. explicit "Convert to editable" button —
   which is less surprising for Ali's already-generated 11 pages?
4. The styled-element look: do we lean on element `_style` (current) or promote the richer
   `WrapperProps` (background/gradient/shadow) from the AST now, so presets look premium
   without bespoke components?
5. IA: kill the `/website` mirror, or repurpose it? Your call on the cleanest route.

---

## 6. Honest bottom line for Ali

This is fixable and it's the *right* kind of work — it's the same model GHL uses, and the
AST foundation for it is already in the repo. It is **not** a quick patch: it's building the
preset→primitive expanders and repointing generation. If we do Option B, your generated
pages become fully editable like GHL, but better-looking by default. If we judge that too
big, that's the honest signal to use GHL instead. My recommendation is Option B.
