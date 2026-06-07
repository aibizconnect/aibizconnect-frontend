# 🔒 Occasions Engine — LOCKED (approved by Ali, 2026-06-05)

**Status: FROZEN. Do not change behavior, structure, or UI without an explicit
new instruction from Ali that says to re-open Occasions.** Ali signed off ("amazing,
lock in the occasion and don't let it get changed").

## Owned files (do not refactor/restructure)
- `lib/occasions.ts` — data model, catalog, `resolveActive`
- `components/site/SiteOccasions.tsx` — renderer (engines + banners)
- `app/tenants/[tenantId]/website/[websiteId]/OccasionsPanel.tsx` — settings UI

## Locked behavior
1. **Two independent systems:** Animations (ambient flying effects) and Holiday/Custom
   banners. Animations never carry a banner; banners never carry an animation.
2. **Shared controls at the top, as a separate entity (not inside the collapsible
   Animations group):**
   - *Animation & flight controls (shared):* Size, Speed, Density, Randomness.
     **No Location** (animations are random/full). Drives every animation AND the
     fly-across plane (speed + random wait/height).
   - *Banner appearance (shared):* Background, Text, Pattern, Position (3×3 grid),
     Width(px), Dismissible. This is the DEFAULT for all banners.
3. **Per-occasion appearance override:** every holiday and custom occasion has its own
   "Appearance (overrides shared)" controls. Set fields override the shared style for
   that occasion only; unset fields fall back to shared. (`BannerEntry.style`,
   `CustomBanner.style`.)
4. **Animations** are a fixed, non-deletable collapsible list of toggles, each with
   When = Always | Date range. Engines: emoji particle (snow/hearts/confetti/leaves/
   butterflies/petals/shamrocks/pumpkins/lanterns), SVG sprite (Santa), canvas
   FireworkSystem (fireworks), CSS glow (sun rays). Ported from Ali's own scripts.
5. **Banners** = on/off + message + [Banner | 🛩️ Fly across] + appearance override.
   Holiday catalog: US / Canadian / Cultural New Years / Other Celebrations.
6. **Fly-across plane** follows the Santa pattern: one smooth Web-Animations-API pass
   left→right (random entry side), then hide, random wait, fly again at a new random
   height. Speed + wait from the shared controls. Plane transform is
   `rotate(315deg) scaleY(-1)` (nose points in direction of travel). **Do not change
   this transform** — Ali approved the exact angle.
7. Persisted to `theme.site.occasions` (no migration). Drafts only — no publish/charge.

## If a change is ever needed
Only on Ali's explicit say-so. When that happens, update this doc in the same change.
