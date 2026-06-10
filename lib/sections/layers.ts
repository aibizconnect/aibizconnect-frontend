/**
 * Layers tree (Webflow-style) builder.
 *
 * Turns the page's flat `draft_sections` (legacy SectionContent[]) into the
 * hierarchical Section → Row → Column → Element tree the user sees in the Layers
 * panel. This is a READ-ONLY, presentational projection — it never mutates data.
 *
 *  - `row` sections expose their REAL structure (columns + children, incl.
 *    nested rows), and those element nodes are individually selectable today.
 *  - Composite sections (hero, features, cta, …) are DECOMPOSED via a blueprint
 *    so the tree shows their logical parts (Headline, Sub-Headline, Button,
 *    Image, …). Until "decompose-on-generate" (Option B) lands, clicking a
 *    blueprint sub-node selects the parent composite section.
 */
import type { SectionContent, SectionType } from "./schemas";
import { sectionLabels } from "./schemas";

export type LayerKind = "section" | "row" | "column" | "element";
export type ElPath = { col: number; idx: number }[];

export interface LayerNode {
  id: string;                 // stable path id, e.g. "0", "0.r0.c1.e2"
  kind: LayerKind;
  label: string;              // "Hero", "Row 1", "Column 1", "Headline"
  type?: string;              // element/section content type (for the icon)
  sectionIndex: number;       // top-level section index (for selection)
  childPath?: ElPath;         // real, selectable row child (full path, any depth)
  blueprint?: boolean;        // true = composite part (selects the whole section)
  globalId?: string;          // set on global Header/Footer nodes → edit in Blocks
  children?: LayerNode[];
}

/** A global Header/Footer block attached to the page (edited centrally in Blocks). */
export interface GlobalBlockInput {
  id: string;
  name: string;
  type: string;
  content: any;
  position: "header" | "footer";
}

/** Friendly element label (Headline / Paragraph / Image / List …). */
function elLabel(type: string): string {
  const map: Record<string, string> = {
    heading: "Headline",
    subheading: "Sub-Headline",
    text: "Paragraph",
    image: "Image",
    button: "Button",
    "bullet-list": "List",
    social: "Icons",
    divider: "Divider",
    video: "Video",
    spacer: "Spacer",
  };
  return map[type] ?? sectionLabels[type as SectionType] ?? "Element";
}

const el = (
  type: string,
  sectionIndex: number,
  id: string,
  childPath?: ElPath,
  blueprint = false,
  name?: string
): LayerNode => ({ id, kind: "element", type, label: name || elLabel(type), sectionIndex, childPath, blueprint });

/** Build a Column node wrapping a list of element nodes. */
function col(id: string, n: number, children: LayerNode[]): LayerNode {
  return { id, kind: "column", label: `Column ${n}`, sectionIndex: children[0]?.sectionIndex ?? 0, children };
}
function row(id: string, n: number, columns: LayerNode[]): LayerNode {
  return { id, kind: "row", label: n > 0 ? `Row ${n}` : "Row (Nested)", sectionIndex: columns[0]?.sectionIndex ?? 0, children: columns };
}

/** Recursively build the columns of a `row` content. Every element (at any depth)
 * is selectable via its full path. Nested rows recurse with the accumulated path. */
function rowColumns(content: any, si: number, prefix: ElPath, idBase: string): LayerNode[] {
  const cols = Math.max(1, Math.min(12, content.columns || 1));
  const columns: LayerNode[] = [];
  for (let c = 0; c < cols; c++) {
    const cell: any[] = Array.isArray(content.children?.[c]) ? content.children[c] : [];
    const kids: LayerNode[] = cell.map((child, i) => {
      const path: ElPath = [...prefix, { col: c, idx: i }];
      const id = `${idBase}.c${c}.e${i}`;
      if (child?.type === "row") {
        const nestedCols = rowColumns(child, si, path, `${id}.n`);
        return { ...row(id, 0, nestedCols), label: child?._name || "Row (Nested)", childPath: path };
      }
      return el(child?.type ?? "text", si, id, path, false, child?._name);
    });
    columns.push(col(`${idBase}.c${c}`, c + 1, kids));
  }
  return columns;
}

/** Decompose a REAL `row` section into its actual columns/children (selectable). */
function realRow(content: any, si: number): LayerNode[] {
  return [row(`${si}.r0`, 1, rowColumns(content, si, [], `${si}.r0`))];
}

/** Blueprint: decompose a composite section into its logical parts (display only). */
function blueprintFor(content: any, si: number): LayerNode[] {
  const B = (type: string, key: string) => el(type, si, `${si}.bp.${key}`, undefined, true);
  const t = content.type as SectionType;

  switch (t) {
    case "hero": {
      const left: LayerNode[] = [B("heading", "h")];
      if (content.subheading) left.push(B("subheading", "sub"));
      if (content.primaryCta) left.push(B("button", "pcta"));
      if (content.secondaryCta) left.push(B("button", "scta"));
      const right: LayerNode[] = [B("image", "img")];
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, left), col(`${si}.c1`, 2, right)])];
    }
    case "cta": {
      const kids = [B("heading", "h")];
      if (content.subheading) kids.push(B("subheading", "sub"));
      kids.push(B("button", "cta"));
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, kids)])];
    }
    case "features": {
      const cards: LayerNode[] = (content.features ?? []).map((f: any, i: number) =>
        col(`${si}.f${i}`, i + 1, [
          ...(f.icon ? [B("image", `f${i}-ic`)] : []),
          B("heading", `f${i}-t`),
          B("text", `f${i}-d`),
        ])
      );
      const inner = cards.length ? [row(`${si}.nr`, 0, cards)] : [];
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, [B("heading", "h"), ...inner])])];
    }
    case "testimonials": {
      const cards: LayerNode[] = (content.items ?? []).map((it: any, i: number) =>
        col(`${si}.t${i}`, i + 1, [
          B("text", `t${i}-q`),
          ...(it.avatarUrl ? [B("image", `t${i}-a`)] : []),
          B("heading", `t${i}-n`),
          ...(it.role ? [B("subheading", `t${i}-r`)] : []),
        ])
      );
      const inner = cards.length ? [row(`${si}.nr`, 0, cards)] : [];
      const head = content.heading ? [B("heading", "h")] : [];
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, [...head, ...inner])])];
    }
    case "pricing": {
      const plans: LayerNode[] = (content.plans ?? []).map((p: any, i: number) =>
        col(`${si}.p${i}`, i + 1, [B("heading", `p${i}-n`), B("heading", `p${i}-pr`), B("bullet-list", `p${i}-f`), B("button", `p${i}-c`)])
      );
      const inner = plans.length ? [row(`${si}.nr`, 0, plans)] : [];
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, inner)])];
    }
    case "faq": {
      const kids: LayerNode[] = [];
      (content.items ?? []).forEach((_: any, i: number) => { kids.push(B("heading", `q${i}`), B("text", `a${i}`)); });
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, kids)])];
    }
    case "listings": {
      const cards: LayerNode[] = (content.items ?? []).map((_: any, i: number) =>
        col(`${si}.l${i}`, i + 1, [B("image", `l${i}-i`), B("heading", `l${i}-t`), B("text", `l${i}-p`), B("button", `l${i}-c`)])
      );
      const inner = cards.length ? [row(`${si}.nr`, 0, cards)] : [];
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, [B("heading", "h"), ...inner])])];
    }
    case "contact-form": {
      const kids = [B("heading", "h")];
      if (content.subheading) kids.push(B("subheading", "sub"));
      (content.fields ?? []).forEach((_: any, i: number) => kids.push(B("text", `field${i}`)));
      kids.push(B("button", "submit"));
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, kids)])];
    }
    case "gallery":
    case "logos":
    case "slider": {
      const imgs = (content.images ?? []).map((_: any, i: number) => B("image", `g${i}`));
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, imgs.length ? imgs : [B("image", "g0")])])];
    }
    case "imported-html":
    case "imported-css":
      // LOSSLESS bands: their inner Layer Tree lives in the canvas (per-band, by data-uid) —
      // a fake "Row 1" child here only misled (D-191). The band itself is still selectable.
      return [];
    default:
      // simple element (heading/text/image/button/…): one column, one element
      return [row(`${si}.r0`, 1, [col(`${si}.c0`, 1, [el(t, si, `${si}.e0`, undefined, true)])])];
  }
}

/** Section-level label (type-only spec): Header / Hero / Footer / Section N. */
function sectionLabel(content: any, index: number, total: number): string {
  const role = content?._role ?? content?.role;
  const rawName = String(content?._name ?? "").trim();
  const name = rawName.toLowerCase();
  // Header / Footer win regardless of position (by role, type, or element name).
  if (role === "header" || content?.type === "header" || name === "header") return "Header";
  if (role === "footer" || content?.type === "footer" || name === "footer") return "Footer";
  if (content?.type === "hero" || role === "hero") return "Hero";
  // Lossless bands carry their REAL name from the design ("Ottawa mortgages made simple.").
  if (content?.type === "imported-html" && rawName) return rawName.slice(0, 32);
  if (content?.type === "imported-css") return "Design CSS";
  return `Section ${index + 1}`;
}

/** Stamp a globalId onto a node subtree (so any descendant click → edit in Blocks). */
function stampGlobal(node: LayerNode, globalId: string): LayerNode {
  node.globalId = globalId;
  node.children?.forEach((c) => stampGlobal(c, globalId));
  return node;
}

/** Build a section node from arbitrary content (row → real, composite → blueprint). */
function sectionNode(content: any, si: number, label: string, idPrefix: string): LayerNode {
  const rows = content?.type === "row" ? realRow(content, si) : blueprintFor(content, si);
  return { id: idPrefix, kind: "section", label, type: content?.type, sectionIndex: si, children: rows };
}

/** Build the full Layers tree: Header(s) → page sections → Footer(s). */
export function buildLayers(sections: SectionContent[], globals: GlobalBlockInput[] = []): LayerNode[] {
  const headers = globals.filter((g) => g.position === "header");
  const footers = globals.filter((g) => g.position === "footer");
  // Always label the global blocks "Header" / "Footer" (with an index suffix only
  // when there is more than one) so the tree always reads Header … Footer.
  const headerNodes = headers.map((g, i) =>
    stampGlobal(sectionNode(g.content, -1, headers.length > 1 ? `Header ${i + 1}` : "Header", `gh${i}`), g.id)
  );
  const footerNodes = footers.map((g, i) =>
    stampGlobal(sectionNode(g.content, -1, footers.length > 1 ? `Footer ${i + 1}` : "Footer", `gf${i}`), g.id)
  );
  const sectionNodes = sections.map((content: any, si) =>
    sectionNode(content, si, sectionLabel(content, si, sections.length), `${si}`)
  );
  // the leading builder convention: the page's first section is the Header and its last is the
  // Footer. Only apply this positionally when there is NO separate global Header/
  // Footer block (otherwise we'd end up with two) and the section wasn't already
  // recognised as a Header/Footer by role/type/name above.
  if (sectionNodes.length > 1) {
    if (!headerNodes.length && sectionNodes[0].label.startsWith("Section ")) {
      sectionNodes[0].label = "Header";
    }
    const last = sectionNodes[sectionNodes.length - 1];
    if (!footerNodes.length && last.label.startsWith("Section ")) {
      last.label = "Footer";
    }
  }
  return [...headerNodes, ...sectionNodes, ...footerNodes];
}
