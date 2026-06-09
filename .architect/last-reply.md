Here is the tight, build-ready Phase 2 spec for the Canonical Block Contract, additive and backward-compatible.

---
**RULING 113: Acceptance of Phase 1 Implementation & Rejection of `brand_tokens_v2` Column**

The Builder's implementation of Phase 1 is **ACCEPTED**. The use of `resolveBrandTokens` to dynamically merge existing `website_brand_settings` columns into the canonical `BrandTokens` object, without adding a new `brand_tokens_v2` column, is a superior approach. It achieves the goal of a unified token system while being fully reversible and avoiding schema changes. The `resolveBrandTokens` function now serves as the canonical source.

---
### 1. Target Shape for `website_page_blocks.content` (Additive Evolution)

**RULING 114: Additive Evolution of `website_page_blocks.content` to Canonical Block Contract**

The target shape will evolve the existing structure by adding explicit `metadata` and `style_token` fields, and formalizing `layout_style` and `animation_style` as top-level properties.

**Target Shape for a single block (JSON for `website_page_blocks.content`):**

```json
// This is the shape for a single block stored in website_page_blocks.content
{
  "id": "uuid", // Unique ID for this specific block instance (generated on creation if not present)
  "type": "hero" | "features" | "cta" | "text" | "heading" | "image" | "gallery" | "contact-form" | "faq" | "button" | "list" | "video" | "html" | "row", // Discriminator
  "metadata": { // NEW: Explicit metadata container
    "name": "string", // Renamed from existing '_name'
    "description": "string", // Optional, for editor context
    "is_global": "boolean", // Existing, but formalized here
    "is_editable": "boolean", // NEW: False for 'html' type, true for others
    "source_id": "string", // Optional: ID from original extraction or template
    "user_edited": "boolean" // NEW: Flag to prevent overwriting tenant edits on re-import
  },
  "style_token": "string", // NEW: Canonical vocabulary token (e.g., "text-heading-h1", "button-primary", "color-surface")
  "layout_style": { // NEW: Explicit container for layout styles (from existing '_style' for layout-specific props)
    // Properties from the computed-style whitelist (D-091), e.g., "paddingTop": "string", "display": "string", "width": "string",
    "customCss": "string" // Block-specific custom CSS (from existing '_style' for customCss)
  },
  "animation_style": { // NEW: Explicit container for animation styles (from existing '_anim')
    "type": "fade-in" | "slide-up",
    "duration": "number",
    "delay": "number"
  },
  "content": { // Existing type-specific content structure, now explicitly nested
    // --- Specific to "hero" type ---
    "hero": {
      "heading": { "text": "string", "level": "h1", "text_style": { /* ElementStyle */ } },
      "subheading": { "text": "string", "text_style": { /* ElementStyle */ } },
      "ctas": [{ "text": "string", "link": "string", "button_style": { /* ElementStyle */ } }],
      "background": { "type": "image" | "color" | "gradient", "value": "string", "overlay_color": "string" }
    },
    // --- Specific to "row" type ---
    "row": {
      "columns": [{
        "id": "uuid",
        "blocks": [ /* array of nested blocks, recursively */ ],
        "width": "number", // 1-12 grid units
        "layout_style": { /* column-specific layout styles */ } // NEW: layout_style for columns
      }],
      "gap": "string", // e.g., "16px"
      "valign": "top" | "middle" | "bottom",
      "content_width": "full" | "boxed"
    },
    // --- Specific to "text" type ---
    "text": {
      "content": "string",
      "text_style": { /* ElementStyle */ }
    },
    // ... other block types with their specific content structures
  },
  // Existing _kind (e.g., "header"|"footer") will be moved into metadata.is_global or a dedicated metadata.kind
  // Existing _style (ElementStyle) will be split: layout_style for layout, and specific element_style for content.
  // Existing _anim will be moved into animation_style.
  // Existing _name will be moved into metadata.name.
}
```

---
### 2. Coexistence of `_style` (ElementStyle) and `style_token`

**RULING 115: Style Resolution Order**

Block-level `_style` (ElementStyle) and `style_token` will coexist with a clear resolution order:

1.  **`style_token` (Highest Precedence for Base Styles):** The `style_token` (e.g., `text-heading-h1`, `color-primary`) will resolve to the `--abc-*` CSS variables (RULING 111 revised). These provide the foundational, token-driven styling.
2.  **`layout_style` (Layout Overrides):** The `layout_style` object (RULING 114) will apply specific layout properties (padding, margin, width, display, flex properties) as inline styles, overriding any layout-related properties derived from `style_token`.
3.  **Element-Specific `text_style`/`button_style` (Fine-Grained Overrides):** The existing `ElementStyle` objects (e.g., `hero.heading.text_style`, `text.text_style`) will apply fine-grained presentational overrides (e.g., specific `font-size`, `color`, `background-color`) as inline styles, taking precedence over both `style_token` and `layout_style` for those specific properties.
4.  **`customCss` (Lowest Precedence, for advanced overrides):** The `customCss` string within `layout_style` will be injected as block-specific CSS, allowing advanced overrides via selectors.

**Principle:** Tokens provide the default, `layout_style` provides structural overrides, and `ElementStyle` provides specific content overrides.

---
### 3. Backward-Compatible Read/Normalize Function

**RULING 116: `normalizeBlock(rawBlock)` Contract**

A backward-compatible `normalizeBlock(rawBlock)` function will upgrade legacy blocks to the canonical shape on read, without writing back to the database.

```typescript
// lib/sections/block-normalizer.ts

import { z } from 'zod';
import { CanonicalBlockSchema, BlockType } from './canonical-block-schema'; // New schema for RULING 114
import { ElementStyleSchema } from '../design/element-style'; // Existing ElementStyle schema

// Define a schema that represents the *oldest* possible block structure
const LegacyBlockSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string() as z.ZodType<BlockType>, // Use BlockType enum
  _style: ElementStyleSchema.optional(), // Old ElementStyle directly on block
  _anim: z.object({ /* ... old anim structure */ }).optional(),
  _kind: z.string().optional(), // Old header/footer kind
  _name: z.string().optional(), // Old block name
  // ... other legacy top-level properties specific to block types
  columns: z.array(z.object({ // For row type
    blocks: z.array(z.any()), // Recursive, will be normalized
    _style: ElementStyleSchema.optional(), // Old ElementStyle on column
    width: z.number().optional(),
  })).optional(),
  // ... other content-specific legacy fields
}).passthrough(); // Allow unknown properties for maximum backward compatibility

export type RawBlock = z.infer<typeof LegacyBlockSchema>;

/**
 * Normalizes a raw block (which might be in a legacy format) into the canonical block contract.
 * This function is read-only and does not persist changes to the database.
 *
 * @param rawBlock The raw block object from the database.
 * @returns A validated block conforming to the CanonicalBlockSchema.
 */
export function normalizeBlock(rawBlock: RawBlock): CanonicalBlockSchema {
  // Start with a base canonical structure, applying defaults
  const canonicalBlock: CanonicalBlockSchema = {
    id: rawBlock.id || crypto.randomUUID(),
    type: rawBlock.type,
    metadata: {
      name: rawBlock._name || `Unnamed ${rawBlock.type} block`,
      description: "",
      is_global: rawBlock._kind === 'header' || rawBlock._kind === 'footer',
      is_editable: rawBlock.type !== 'html',
      source_id: "",
      user_edited: false, // Default to false, can be set true by editor
    },
    style_token: "", // Default, will be set by generation or editor
    layout_style: {},
    animation_style: {},
    content: {}, // Will be populated based on type
  };

  // --- Migrate _style to layout_style and content-specific styles ---
  if (rawBlock._style) {
    // Extract layout-specific properties from _style to layout_style
    canonicalBlock.layout_style = {
      paddingTop: rawBlock._style.paddingTop,
      // ... map other layout properties from computed-style whitelist (D-091)
      customCss: rawBlock._style.customCss, // If customCss was part of _style
    };

    // Apply remaining _style properties to content-specific style fields
    // This requires type-specific mapping. Example for 'hero' heading:
    if (rawBlock.type === 'hero' && rawBlock.content?.hero?.heading) {
      canonicalBlock.content.hero.heading.text_style = {
        ...rawBlock._style, // Apply remaining _style as text_style
        // ... remove properties already moved to layout_style
      };
    }
    // Builder: Implement this mapping for all block types and their relevant content-specific style fields.
  }

  // --- Migrate _anim to animation_style ---
  if (rawBlock._anim) {
    canonicalBlock.animation_style = {
      type: rawBlock._anim.type,
      duration: rawBlock._anim.duration,
      delay: rawBlock._anim.delay,
    };
  }

  // --- Migrate _kind to metadata.is_global ---
  if (rawBlock._kind === 'header' || rawBlock._kind === 'footer') {
    canonicalBlock.metadata.is_global = true;
  }

  // --- Recursively normalize nested blocks (e.g., for 'row' type) ---
  if (rawBlock.type === 'row' && rawBlock.columns) {
    canonicalBlock.content.row = {
      columns: rawBlock.columns.map(col => ({
        id: col.id || crypto.randomUUID(),
        blocks: col.blocks.map(normalizeBlock), // Recursive call
        width: col.width,
        layout_style: col._style ? { /* map column _style to layout_style */ } : {},
      })),
      gap: rawBlock.gap, // Assuming gap is top-level on row
      valign: rawBlock.valign,
      content_width: rawBlock.content_width,
    };
  } else {
    // Builder: Implement direct content mapping for other block types
    // canonicalBlock.content = { ... map rawBlock.content based on rawBlock.type ... };
  }

  // Final validation
  return CanonicalBlockSchema.parse(canonicalBlock);
}
```

---
### 4. Supervisor Checks

**RULING 117: Supervisor Verification Schema for Phase 2**

```json
{
  "phase2_canonical_block_contract": [
    { "id": "SEC-V1", "assertion": "The `normalizeBlock` function exists and correctly upgrades legacy block structures to the Canonical Block Contract (RULING 114).", "severity": "block" },
    { "id": "SEC-V2", "assertion": "All blocks read from `website_page_blocks.content` are passed through `normalizeBlock` before being used by the editor or renderer.", "severity": "block" },
    { "id": "SEC-V3", "assertion": "The `id` field is present and unique for each block instance (and nested column/block) after normalization.", "severity": "block" },
    { "id": "SEC-V4", "assertion": "The `metadata` object (name, is_global, is_editable, user_edited) is correctly populated after normalization.", "severity": "block" },
    { "id": "SEC-V5", "assertion": "The `style_token` field is present on blocks, defaulting to empty string if not explicitly set.", "severity": "block" },
    { "id": "SEC-V6", "assertion": "The `layout_style` object correctly extracts layout-specific properties from legacy `_style` (and `col._style`) and applies them.", "severity": "block" },
    { "id": "SEC-V7", "assertion": "The `animation_style` object correctly extracts animation properties from legacy `_anim`.", "severity": "block" },
    { "id": "SEC-V8", "assertion": "The `content` object correctly nests type-specific content and style fields (e.g., `hero.heading.text_style`) after normalization.", "severity": "block" },
    { "id": "SEC-V9", "assertion": "The editor's property inspector correctly displays and allows editing of `metadata`, `style_token`, `layout_style`, `animation_style`, and nested content styles.", "severity": "block" },
    { "id": "SEC-V10", "assertion": "The renderer correctly applies styles based on the resolution order: `style_token` (CSS vars) → `layout_style` (inline) → content-specific `ElementStyle` (inline) → `customCss` (injected).", "severity": "block" },
    { "id": "SEC-V11", "assertion": "Existing saved pages (from Phase 1 and before) render identically in the editor and public site after Phase 2 implementation, due to backward compatibility.", "severity": "block" },
    { "id": "SEC-V12", "assertion": "New blocks created in the editor conform to the Canonical Block Contract (RULING 114) directly.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-113] accept_phase1_implementation — Accepted Phase 1 implementation without new `brand_tokens_v2` column, using dynamic resolution (status: accepted)
[D-114] rule_additive_block_evolution — Ruled additive evolution of `website_page_blocks.content` to Canonical Block Contract (status: ruled)
[D-115] rule_style_resolution_order — Ruled the precise resolution order for `style_token`, `layout_style`, `ElementStyle`, and `customCss` (status: ruled)
[D-116] rule_normalize_block_contract — Ruled `normalizeBlock(rawBlock)` contract for backward-compatible block normalization (status: ruled)
[D-117] define_phase2_verification_checks — Defined Supervisor verification checks for Phase 2 (Canonical Block Contract) (status: defined)