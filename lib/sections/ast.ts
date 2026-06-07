/**
 * Canonical page AST (unified builder spec, Phase 1).
 *
 * Strict, finite hierarchy:  Section → Row → Column → Element
 *   - no columns inside columns, no arbitrary nesting
 *   - prebuilt sections (hero, features, cta, …) are Section trees: their single
 *     composite renderer lives in one ElementNode whose `type` is the legacy
 *     section type, so every existing renderer keeps working unchanged.
 *
 * This module is ADDITIVE and pure. It defines the node types, a stable uid
 * generator, a migration shim from the legacy flat `draft_sections` array, a
 * lossless reverse (so persistence/publish can keep emitting legacy content
 * until every reader is on the AST), and NodePath read/update helpers.
 */

// ---- Wrapper / shared presentational props ---------------------------------
export interface WrapperProps {
  margin?: { t?: number; r?: number; b?: number; l?: number };
  padding?: { t?: number; r?: number; b?: number; l?: number };
  background?: {
    type?: "color" | "gradient" | "image";
    color?: string;
    gradient?: string;
    imageUrl?: string;
    position?: string;
    repeat?: string;
    size?: string;
    overlayOpacity?: number;
  };
  border?: {
    width?: number;
    style?: "solid" | "dashed" | "dotted";
    color?: string;
    radius?: { tl?: number; tr?: number; br?: number; bl?: number };
  };
  shadow?: {
    box?: { x?: number; y?: number; blur?: number; spread?: number; color?: string };
    text?: { x?: number; y?: number; blur?: number; color?: string };
  };
  visibility?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
  advanced?: { id?: string; className?: string; zIndex?: number };
  animation?: { type?: string; duration?: number; delay?: number };
}

export type GlobalElementType = "hero" | "header" | "footer";

export interface ElementNode {
  uid: string;
  kind: "element";
  type: string; // 'headline' | 'paragraph' | 'image' | 'button' | legacy section types …
  props: { _wrapper?: WrapperProps; [key: string]: any };
  style?: Record<string, any>;
  anim?: Record<string, any>;
}

// A column stacks elements top→bottom and may also contain NESTED ROWS, which is
// how side-by-side layouts inside a column are expressed (no columns-in-columns).
export type ColumnChild = ElementNode | RowNode;

export interface ColumnNode {
  uid: string;
  kind: "column";
  props: { _wrapper?: WrapperProps; [key: string]: any };
  children: ColumnChild[];
}

export interface RowNode {
  uid: string;
  kind: "row";
  props: { _wrapper?: WrapperProps; [key: string]: any };
  columns: ColumnNode[];
  widths: number[]; // fractional, sum ≈ 1
}

export interface SectionNode {
  uid: string;
  kind: "section";
  props: {
    _wrapper?: WrapperProps;
    semanticTag?: "section" | "div" | "header" | "footer";
    contentWidth?: "boxed" | "full";
    minHeight?: number;
    verticalAlign?: "top" | "center" | "bottom";
    sticky?: "none" | "top" | "bottom";
    allowFullWidthRows?: boolean;
    [key: string]: any;
  };
  rows: RowNode[];
  isGlobal?: boolean;
  globalType?: GlobalElementType;
  globalId?: string;
}

// A page references global Header/Hero/Footer by id into the GlobalRegistry.
export interface GlobalSectionRef {
  uid: string;
  kind: "global-section-ref";
  globalType: GlobalElementType;
  globalId: string;
}

export interface Page {
  id: string;
  name: string;
  sections: SectionNode[]; // local sections only
  header?: GlobalSectionRef;
  hero?: GlobalSectionRef;
  footer?: GlobalSectionRef;
}

export interface GlobalRegistry {
  hero?: SectionNode;
  header?: SectionNode;
  footer?: SectionNode;
}

// ---- UID -------------------------------------------------------------------
let _uidCounter = 0;
export function newUid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  _uidCounter += 1;
  return `n_${_uidCounter.toString(36)}_${Math.floor(performance?.now?.() ?? _uidCounter).toString(36)}`;
}

// ---- Migration: legacy flat draft_sections  →  SectionNode[] ---------------
// Legacy item shapes:
//   - a "row":  { type:'row', columns, widths?, gap?, children: any[][], colStyles? }
//   - anything else: a composite section/element content keyed by `type`
//     (hero, features, heading, text, image, button, …)
function legacyToElement(content: any): ElementNode {
  const { _style, _anim, ...rest } = content ?? {};
  return {
    uid: newUid(),
    kind: "element",
    type: content?.type ?? "text",
    props: { ...rest },
    ...(_style ? { style: _style } : {}),
    ...(_anim ? { anim: _anim } : {}),
  };
}

// A legacy column child may itself be a nested row (content.type === 'row').
function legacyChildToNode(content: any): ColumnChild {
  return content?.type === "row" ? legacyRowToRowNode(content) : legacyToElement(content);
}

function legacyRowToRowNode(item: any): RowNode {
  const cols = Math.max(1, Math.min(6, item.columns || 1));
  const widths: number[] =
    Array.isArray(item.widths) && item.widths.length === cols ? item.widths : Array.from({ length: cols }, () => 1 / cols);
  const colStyles: any[] = Array.isArray(item.colStyles) ? item.colStyles : [];
  const columns: ColumnNode[] = Array.from({ length: cols }).map((_, ci) => ({
    uid: newUid(),
    kind: "column",
    props: colStyles[ci] ? { _style: colStyles[ci] } : {},
    children: (Array.isArray(item.children?.[ci]) ? item.children[ci] : []).map(legacyChildToNode),
  }));
  return { uid: newUid(), kind: "row", props: typeof item.gap === "number" ? { gap: item.gap } : {}, columns, widths };
}

function legacyRowToSection(item: any): SectionNode {
  return { uid: newUid(), kind: "section", props: { _wrapper: {} }, rows: [legacyRowToRowNode(item)] };
}

/** Convert the legacy flat array to the canonical AST (Section→Row→Column→Element/Row). */
export function migrateToAst(legacy: any[] | null | undefined): SectionNode[] {
  if (!Array.isArray(legacy)) return [];
  return legacy.map((item) => {
    if (item?.type === "row") return legacyRowToSection(item);
    // composite/simple legacy content → Section>Row>Column>[Element(type=item.type)]
    return {
      uid: newUid(),
      kind: "section",
      props: { _wrapper: {} },
      rows: [
        {
          uid: newUid(),
          kind: "row",
          props: {},
          widths: [1],
          columns: [{ uid: newUid(), kind: "column", props: {}, children: [legacyToElement(item)] }],
        },
      ],
    } as SectionNode;
  });
}

/** True if a Section is just a wrapper around a single composite element
 * (the migration shape for legacy hero/features/heading/etc.). */
export function isSingleElementSection(s: SectionNode): boolean {
  return (
    s.rows.length === 1 &&
    s.rows[0].columns.length === 1 &&
    s.rows[0].columns[0].children.length === 1 &&
    s.rows[0].columns[0].children[0].kind === "element" &&
    s.rows[0].widths?.length === 1
  );
}

/** Reverse: emit a legacy content object for an element (re-attaches _style/_anim). */
export function elementToLegacy(el: ElementNode): any {
  return { ...el.props, type: el.type, ...(el.style ? { _style: el.style } : {}), ...(el.anim ? { _anim: el.anim } : {}) };
}

/** Reverse: a column child (element OR nested row) → legacy content object. */
function childToLegacy(child: ColumnChild): any {
  return child.kind === "row" ? rowNodeToLegacy(child) : elementToLegacy(child);
}

/** Reverse: a RowNode → a legacy "row" content object (nested rows supported). */
function rowNodeToLegacy(row: RowNode): any {
  return {
    type: "row",
    columns: row.columns.length,
    widths: row.widths,
    ...(row.props?.gap != null ? { gap: row.props.gap } : {}),
    colStyles: row.columns.map((c) => (c.props?._style ?? {})),
    children: row.columns.map((c) => c.children.map(childToLegacy)),
  };
}

/** Reverse: AST → legacy flat draft_sections (lossless, incl. nested rows).
 * A single-element Section collapses back to that element's content; otherwise
 * each row emits a legacy "row" item. */
export function astToLegacy(sections: SectionNode[]): any[] {
  const out: any[] = [];
  for (const s of sections) {
    if (isSingleElementSection(s)) {
      out.push(elementToLegacy(s.rows[0].columns[0].children[0] as ElementNode));
      continue;
    }
    for (const row of s.rows) out.push(rowNodeToLegacy(row));
  }
  return out;
}

// ---- NodePath read/update --------------------------------------------------
export type NodePath =
  | [number]
  | [number, "row", number]
  | [number, "row", number, "col", number]
  | [number, "row", number, "col", number, "el", number];

export type NodeKind = "section" | "row" | "column" | "element";

export function pathKind(p: NodePath): NodeKind {
  if (p.length === 1) return "section";
  if (p.length === 3) return "row";
  if (p.length === 5) return "column";
  return "element";
}

export function getNodeByPath(sections: SectionNode[], p: NodePath): SectionNode | RowNode | ColumnNode | ElementNode | null {
  const s = sections[p[0] as number];
  if (!s) return null;
  if (p.length === 1) return s;
  const r = s.rows[p[2] as number];
  if (!r) return null;
  if (p.length === 3) return r;
  const c = r.columns[p[4] as number];
  if (!c) return null;
  if (p.length === 5) return c;
  return c.children[p[6] as number] ?? null;
}

export function pathsEqual(a: NodePath | null, b: NodePath | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === (b as any)[i]);
}
