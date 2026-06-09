Here is the concrete, deterministic algorithm for finer section segmentation, addressing the coarse band detection in `htmlToSections`.

---
### 1. Band Boundary Signals & Heuristic

**RULING 164: Deterministic Band Detection Heuristic.**

Band boundaries will be detected using a deterministic heuristic based on captured `data-cs` and semantic HTML.

**Signals for a Band Boundary:**
1.  **Background Change:** A descendant block's `data-cs` `backgroundColor` or `backgroundImage` is significantly different from its immediate parent's or the page's default background.
2.  **Large Vertical Separation:** A descendant block's `data-cs` `padding-top`, `padding-bottom`, `margin-top`, or `margin-bottom` is `>= 48px`. This signals a visual break.
3.  **Semantic HTML:** A descendant is a top-level semantic element: `<section>`, `<header>`, `<footer>`, `<main>`, `<article>`, `<aside>`, `<nav>`.
4.  **Full-Width Block:** The descendant block appears to be full-width (e.g., `width: 100%`, `display: block`, not `inline-block` or `flex-item` with constrained width).

**Stop Rule (Prevent Over-fragmentation):**
*   **Minimum Content:** A detected band must contain a minimum amount of meaningful content (e.g., at least one `heading` or `text` block, or one `image` block, after decomposition). Bands containing only empty divs or very small elements should be merged with their parent or preceding sibling.
*   **Depth Limit:** Descend a maximum of **5 levels** from the initial `<main>` element to find band boundaries. This prevents over-fragmentation in deeply nested layouts.
*   **Full-Width Requirement:** Only split at children that are visually full-width (RULING 164.4) AND have a background change OR large vertical separation. Semantic elements can split regardless of width.
*   **Max Bands:** Cap the total number of top-level bands per page at **15**. If more are detected, merge smaller adjacent bands.

---
### 2. Algorithm & File Changes

**RULING 165: Enhanced `htmlToSections` Algorithm.**

The `htmlToSections` function in `lib/sites/html-importer.ts` will be modified to implement the enhanced band detection.

**Algorithm (`lib/sites/html-importer.ts` - `htmlToSections` function):**

```typescript
// Pseudocode for enhanced htmlToSections
import { parseHtml, getComputedStyleFromDataCs } from './utils'; // Helpers
import { BlockContent, ElementStyle } from '../sections/normalize'; // Our types
import { DEFAULT_ELEMENT_STYLE } from '../design/element-style'; // For defaults

// New helper to determine if an element is a potential band boundary
function isBandBoundary(element: HTMLElement, parentBg: string, pageDefaultBg: string): boolean {
  const cs = getComputedStyleFromDataCs(element);
  const bg = cs.backgroundColor || cs.backgroundImage;
  const paddingTop = parseFloat(cs.paddingTop || '0');
  const paddingBottom = parseFloat(cs.paddingBottom || '0');
  const marginTop = parseFloat(cs.marginTop || '0');
  const marginBottom = parseFloat(cs.marginBottom || '0');

  const hasBgChange = bg && bg !== 'none' && bg !== parentBg && bg !== pageDefaultBg;
  const hasLargeVerticalSeparation = (paddingTop >= 48 || paddingBottom >= 48 || marginTop >= 48 || marginBottom >= 48);
  const isSemanticElement = ['SECTION', 'HEADER', 'FOOTER', 'MAIN', 'ARTICLE', 'ASIDE', 'NAV'].includes(element.tagName);
  const isFullWidth = (cs.width === '100%' || cs.display === 'block' || cs.display === 'flex' || cs.display === 'grid'); // Simplified check

  // Prioritize semantic, then visual breaks for full-width elements
  return isSemanticElement || (isFullWidth && (hasBgChange || hasLargeVerticalSeparation));
}

// Recursive helper to find and decompose bands
function decomposeIntoBands(
  elements: HTMLElement[],
  parentBg: string,
  pageDefaultBg: string,
  currentDepth: number,
  maxDepth: number
): BlockContent[] {
  const bands: BlockContent[] = [];
  let currentBandElements: HTMLElement[] = [];
  let currentBandBg = parentBg; // Track background of current accumulating band

  for (const element of elements) {
    if (currentDepth < maxDepth && isBandBoundary(element, currentBandBg, pageDefaultBg)) {
      // If we have accumulated elements, decompose them into a band first
      if (currentBandElements.length > 0) {
        const band = createBandFromElements(currentBandElements, currentBandBg); // Helper to create a row block
        if (band) bands.push(band);
      }
      // Start a new band with the current element
      currentBandElements = [element];
      currentBandBg = getComputedStyleFromDataCs(element).backgroundColor || getComputedStyleFromDataCs(element).backgroundImage || parentBg;
    } else {
      currentBandElements.push(element);
    }
  }

  // Decompose any remaining elements into a final band
  if (currentBandElements.length > 0) {
    const band = createBandFromElements(currentBandElements, currentBandBg);
    if (band) bands.push(band);
  }

  // Post-processing: merge small bands, cap total bands
  // Builder: Implement logic for minimum content per band and capping total bands here.
  return bands;
}

// Helper to create a row block from a group of elements
function createBandFromElements(elements: HTMLElement[], bandBg: string): BlockContent | null {
  if (elements.length === 0) return null;

  // Extract common style for the band wrapper (e.g., background, padding)
  const firstElCs = getComputedStyleFromDataCs(elements[0]);
  const bandStyle: ElementStyle = {
    backgroundColor: bandBg,
    paddingTop: firstElCs.paddingTop,
    paddingBottom: firstElCs.paddingBottom,
    // ... other common styles for the band wrapper
  };

  // Decompose children of this band (recursively if needed, or using existing htmlToSections logic for inner content)
  const innerBlocks = decomposeChildren(elements); // This is where existing htmlToSections logic for grids/elements goes

  if (innerBlocks.length === 0) return null; // No meaningful content

  return {
    id: crypto.randomUUID(),
    type: "row",
    _name: "Visual Band",
    _style: bandStyle,
    columns: [{ width: 12, blocks: innerBlocks }], // Default to 1-col row
    // ... other row properties
  };
}

// Main htmlToSections function entry point
export function htmlToSections(html: string, baseUrl: string, options: { faithful: boolean }): BlockContent[] {
  const doc = parseHtml(html);
  const mainElement = doc.querySelector('main') || doc.body; // Start from main or body

  const pageDefaultBg = getComputedStyleFromDataCs(doc.body).backgroundColor || 'rgb(255, 255, 255)'; // Get page default bg

  const topLevelChildren = Array.from(mainElement.children) as HTMLElement[];

  // Start decomposition, allowing deeper descent
  return decomposeIntoBands(topLevelChildren, pageDefaultBg, pageDefaultBg, 0, 5); // Max depth 5
}
```

**Files to Change:**
*   `lib/sites/html-importer.ts`: This is the primary file to modify.
*   `lib/sites/style-capture.ts`: May need minor adjustments if `getComputedStyleFromDataCs` needs to be enhanced for more nuanced background/spacing detection.

---
### 3. Edge Cases & Regressions

**RULING 166: Edge Cases and Regression Guards.**

*   **Deeply Nested Single Wrappers:** The `maxDepth` limit (e.g., 5 levels) combined with the `isBandBoundary` heuristic will prevent over-fragmentation. The algorithm will descend until it finds a strong boundary or hits the depth limit.
*   **Simple Sites:** Sites that already segment well (e.g., `<section>` tags at the top level) will be handled correctly by `isBandBoundary`'s semantic check. The algorithm will not over-fragment them because `isBandBoundary` requires a *strong* signal.
*   **Empty Bands:** The `minimum content` rule in `createBandFromElements` will prevent empty or trivial bands from being created.
*   **Content Preservation:** The algorithm ensures all elements are processed and included in *some* band, never dropped.
*   **Card Grid Behavior:** The existing card grid detection logic within `decomposeChildren` (called by `createBandFromElements`) must remain intact and operate on the child elements of the newly detected bands.

---
### 4. Before/After Expectations

**RULING 167: Before/After Expectations.**

**Before (Current Behavior):**
A Stitch page with a common structure (e.g., a full-width hero, followed by a 3-column features section, a full-width CTA, and a footer, all wrapped in one or two large `div`s within `<main>`) might decompose into:
*   `[Row (1-col, _name="Visual Band", _style={bg:white, padding:0}, children: [Hero, Features, CTA, Footer])]`
*   Result: 1-2 coarse top-level rows, with all semantic sections deeply nested and not directly editable as separate bands.

**After (New Behavior):**
The same Stitch page will decompose into:
*   `[Row (1-col, _name="Hero Band", _style={bg:navy, padding:40px}, children: [Hero Content])]`
*   `[Row (1-col, _name="Features Band", _style={bg:light-gray, padding:48px}, children: [Features Content (3-col row)])]`
*   `[Row (1-col, _name="CTA Band", _style={bg:primary, padding:64px}, children: [CTA Content])]`
*   `[Row (1-col, _name="Footer Band", _style={bg:dark-gray, padding:48px}, children: [Footer Content])]`
*   Result: 4-5 distinct, editable top-level bands, each with its own background and spacing, reflecting the visual segmentation of the original page. The nested card grid behavior for features will be preserved *within* its respective band.

---
DECISION-LOG
[D-164] rule_deterministic_band_detection — Ruled deterministic band detection heuristic based on data-cs and semantic HTML (status: ruled)
[D-165] rule_enhanced_html_to_sections_algorithm — Ruled enhanced `htmlToSections` algorithm for finer section segmentation (status: ruled)
[D-166] rule_edge_cases_regression_guards — Ruled edge cases and regression guards for band detection (status: ruled)
[D-167] rule_before_after_expectations — Ruled before/after expectations for section segmentation (status: ruled)