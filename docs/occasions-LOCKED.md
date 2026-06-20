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
- **Flying-banner airplane transform:** `transform: rotate(45deg) scaleY(-1)`.
  - History: was `rotate(315deg) scaleY(-1)`; **Ali re-approved 2026-06-20** to add **+90° clockwise**
    (315°→45°, since `R(90)·R(315)=R(45)`) so the nose points the way it flies (right). The
    `scaleY(-1)` vertical flip stays.
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
