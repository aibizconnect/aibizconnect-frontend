# Responsive Platform Rule — Canonical Version

**Status:** Ratified (Builder + Copilot architect, 2026‑06). This is the rule the entire
builder, renderer, AI generator, and template system follow. Every tenant website must
render perfectly on desktop, tablet, and mobile **by default** — tenants never have to
configure responsiveness for it to work.

## The rule

1. **Containers stack.** All containers — sections, rows, columns, nested rows, nested
   columns, gallery/feature/pricing/card grids, boxed max‑width wrappers — automatically
   stack vertically and expand to full width at the mobile/tablet breakpoint.
2. **Elements untouched.** Leaf elements (heading, text, image, button, form, menu, icon,
   etc.) are **never** auto‑resized, auto‑realigned, auto‑reordered, or auto‑restyled by
   the platform. Only the fluid baseline applies: clamp() typography + `max-width:100%`
   media.
3. **Recursive.** Stacking applies recursively to all nested containers at the **same
   768px** breakpoint — no special per‑nesting breakpoints.
4. **Fixed widths normalized.** Any fixed‑width column/container becomes 100% width on
   mobile so it can never overflow. (Fixed‑width *leaf elements* are left alone — they're
   not containers.)
5. **Container gap scaling.** Container gaps may shrink on mobile (e.g. 24px → 12px). This
   does not violate "elements untouched."
6. **Header exception.** The responsive header bar (logo left + hamburger right, with nav
   links and CTA buttons inside the ☰ panel) is the **only** exception to element
   preservation.
7. **Element overrides remain opt‑in.** Tenants may apply element‑level responsive
   overrides manually (per‑breakpoint hide/restyle); the platform never forces them.

## Where it's enforced

- `components/sections/registry.tsx` — `case "row"`: auto‑stack (default ON), per‑row
  `keepRowOnMobile` / `reverseOnMobile`, mobile gap scaling, per‑column hide, header
  detection → `HeaderResponsive`.
- `app/.../editor/RowEditor.tsx` — same behavior on the editor canvas, recursive for
  nested rows, driven by the device preview (`bp`).
- `components/sections/HeaderResponsive.tsx` — the header‑bar exception (#6).
- `components/sections/SimpleSections.tsx` — `fluidFontSize()` clamp typography (#2 baseline).
- `app/sites/[tenantId]/[slug]/page.tsx` — global baseline: `img/video max-width:100%`,
  `overflow-x:hidden`, `--abc-maxw → 100%` on mobile (#1/#4 baseline).

## Breakpoints

- Mobile/stacking: `max-width: 768px`.
- Header bar collapse: `max-width: 1024px` (collapses on tablet too, per Ali).
- Editor preview uses the device toggle (`bp`); the live site uses CSS media queries.

## Known editor‑preview caveat

Section‑type internal grids that rely on Tailwind responsive classes (e.g. some
gallery/feature components) stack correctly on the **published** site (viewport media
queries) but may not visually stack inside the editor's narrow device frame, because the
browser viewport is still wide. The live site is always correct. (Tracked for follow‑up:
migrate those internal grids to `bp`‑aware rendering for exact editor parity.)
