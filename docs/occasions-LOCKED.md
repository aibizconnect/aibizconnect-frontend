# 🔒 Occasions — LOCKED

**Status: LOCKED.** Do NOT change the Occasions engine, renderer, or its UI/controls without
Ali's explicit say-so to re-open. This covers behaviour, layout, animation engines, banner
placement, and the flying-banner airplane.

## Scope of the lock
- `components/site/SiteOccasions.tsx` — the public/preview renderer (emoji/sprite/fireworks/glow
  engines, banners, flying banner). Behaviour is frozen.
- `app/tenants/[tenantId]/website/[websiteId]/OccasionsPanel.tsx` — the dashboard configurator UI.
  Layout + controls are frozen.
- `lib/occasions.ts` — catalog, windows, config shape, `resolveActive`.

## Approved values (do not touch)
- **Flying-banner airplane = an SVG, NOT the 🛩️ emoji** (`PLANE_SVG` in SiteOccasions.tsx).
  - History: started as the 🛩️ emoji with `rotate(315deg) scaleY(-1)`, then `rotate(45deg)`. But the
    emoji renders as a different glyph at a different base angle on Windows vs iOS vs Android, so no
    single rotation points "forward" on all of them (Ali: nose-down on desktop, fine on mobile).
    **Ali-approved 2026-06-20:** replaced with a vector airplane drawn **nose-right** (Bootstrap
    airplane-fill + inner `rotate(90 8 8)`), fill `#1e3a8a`, ~38px. Deterministic on every device.
- Plane faces the direction of travel; the cloth banner trails to its left; enters left, exits right.

## What is allowed without re-opening the lock
- **Scope plumbing only** (not behaviour/layout): occasions are read/written per website via
  `getSiteSettings/saveSiteSettings(tenantId, …, websiteId)`. The brand table currently keys one row
  per tenant, so writes fall back to the tenant row (effective tenant-level) — see
  `writeScopedTheme`/`readScopedTheme`.
- **Rendering the existing component in a new place** — e.g. `components/marketing/abc/MarketingOccasions.tsx`
  mounts `<SiteOccasions>` on the marketing site (aibizconnect.app) via `AbcPage`. This does not change
  the locked component, only where it renders.

To re-open: Ali says so explicitly, naming what to change.
