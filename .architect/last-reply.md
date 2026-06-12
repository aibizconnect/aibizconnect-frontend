Here is the ruling for the Booking Calendar element for the website editor.

---
### 1. Booking Calendar Element

**RULING 246: Implement `booking-calendar` Element for Website Editor.**

*   **Decision:** The proposal for a native element type `booking-calendar` is **APPROVED**.
*   **Action:**
    1.  **Element Schema:**
        ```typescript
        // lib/elements/booking-calendar.ts
        import { z } from 'zod';

        export const BookingCalendarPropsSchema = z.object({
          tenantId: z.string().uuid(), // Stamped at insert time by editor
          calendarSlug: z.string().optional(), // Slug of specific calendar, or empty for index page
          height: z.number().min(300).default(760), // Height in pixels, not subject to spacing cap
        });

        export type BookingCalendarProps = z.infer<typeof BookingCalendarPropsSchema>;

        export const BookingCalendarElementSchema = z.object({
          type: z.literal('booking-calendar'),
          props: BookingCalendarPropsSchema,
          // ... common block metadata/style fields
        });
        ```
    2.  **Naming:** Display name "Booking Calendar" in the Elements-List is **APPROVED**.
    3.  **`tenantId` Stamping:** Stamping `tenantId` at INSERT by the editor is **APPROVED**.
        *   **Rationale:** This is the most practical approach given the render context limitations and the single-tenant nature of pages.
    4.  **Iframe Approach:** The `<iframe src='/book/{tenantId}/{slug}?embed=1' ...>` approach is **APPROVED**.
        *   **Rationale:** This maintains a single, canonical booking surface, leveraging the existing public booking pages and their server-side slot computation. It avoids duplicating complex logic in the editor's frontend.
    5.  **Rendering:**
        *   **Public + Editor Canvas:** Render as an `<iframe>` with `loading="lazy"`, `class="rounded"`, `width="100%"`, and `height` from content.
        *   **Editor Canvas Overlay:** Overlay `pointer-events-none` on the iframe in the editor canvas so clicks select the element instead of interacting with the embedded calendar.
    6.  **Inspector:**
        *   **Controls:** Implement a "Calendar" dropdown (options: "All calendars" + each calendar by name/slug, fed by `listCalendarsAction` or similar API) and a "Height" number input.
        *   **`fieldSpecs`:** If `fieldSpecs` does not support async options, a small dedicated `BookingCalendarInspector` block (similar to `Menu`'s inspector) will be created to fetch calendar options.
        *   **Pre-population:** Pre-populate `tenantId` and pre-select the first calendar (or "All calendars") as default.
    7.  **Registration:** Register in `schemas.ts` (schema/union/order/displayName/defaultContent), `registry.tsx` (render case), `fieldSpecs.ts` (or custom inspector), and `docs/ELEMENT-DICTIONARY.md`.
    8.  **Importer Recognition:** Importer recognition for existing booking embeds (e.g., from Stitch pages) is explicitly **deferred** to a later phase.

---
**Documentation Filing:** The `docs/ELEMENT-DICTIONARY.md` will be updated to include the `booking-calendar` element.

---
DECISION-LOG
[D-246] rule_implement_booking_calendar_element — Ruled implementation of `booking-calendar` element for the website editor (status: ruled)