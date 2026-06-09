/**
 * Immutable, uid-addressed operations over the page AST (SectionNode[]).
 *
 * The editor (and dnd-kit) identify every node by its stable `uid`, so these
 * helpers find/update/insert/move/remove by uid rather than by positional path.
 * Every function returns a NEW tree (structural clone of the touched branch);
 * the input is never mutated. This is the backbone for the editor-on-AST rewire.
 */
import type { SectionNode, RowNode, ColumnNode, ElementNode, ColumnChild } from "./ast";
import { newUid } from "./ast";

export type AstTree = SectionNode[];
export type AnyNode = SectionNode | RowNode | ColumnNode | ElementNode;

// Deep clone — AST nodes are plain JSON-serialisable data.
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Visit every node depth-first. Return false from `fn` to stop early. */
export function walk(tree: AstTree, fn: (node: AnyNode, parent: AnyNode | null) => void | false): void {
  const visit = (node: AnyNode, parent: AnyNode | null): boolean => {
    if (fn(node, parent) === false) return false;
    if (node.kind === "section") {
      for (const r of node.rows) if (!visit(r, node)) return false;
    } else if (node.kind === "row") {
      for (const c of node.columns) if (!visit(c, node)) return false;
    } else if (node.kind === "column") {
      for (const ch of node.children) if (!visit(ch, node)) return false;
    }
    return true;
  };
  for (const s of tree) if (!visit(s, null)) break;
}

export function findByUid(tree: AstTree, uid: string): AnyNode | null {
  let found: AnyNode | null = null;
  walk(tree, (n) => {
    if (n.uid === uid) { found = n; return false; }
  });
  return found;
}

/** Locate a node + its containing array + index (for splice-style edits). */
interface Loc { parentArray: AnyNode[]; index: number; node: AnyNode }
function locate(tree: AstTree, uid: string): Loc | null {
  // top-level sections
  for (let i = 0; i < tree.length; i++) if (tree[i].uid === uid) return { parentArray: tree as AnyNode[], index: i, node: tree[i] };
  let loc: Loc | null = null;
  const scan = (arr: AnyNode[]) => {
    for (let i = 0; i < arr.length; i++) {
      const n = arr[i];
      if (n.uid === uid) { loc = { parentArray: arr, index: i, node: n }; return true; }
      if (n.kind === "section" && scan(n.rows as AnyNode[])) return true;
      if (n.kind === "row" && scan(n.columns as AnyNode[])) return true;
      if (n.kind === "column" && scan(n.children as AnyNode[])) return true;
    }
    return false;
  };
  for (const s of tree) {
    if (s.kind === "section" && scan(s.rows as AnyNode[])) break;
  }
  return loc;
}

/** Immutably replace a node's `props` (shallow-merge patch) by uid. */
export function updateProps(tree: AstTree, uid: string, patch: Record<string, any>): AstTree {
  const next = clone(tree);
  walk(next, (n) => {
    if (n.uid === uid) { (n as any).props = { ...(n as any).props, ...patch }; return false; }
  });
  return next;
}

/** Immutably replace a node wholesale (e.g. an edited element) by uid. */
export function replaceNode(tree: AstTree, uid: string, replacement: AnyNode): AstTree {
  const next = clone(tree);
  const loc = locate(next, uid);
  if (loc) loc.parentArray[loc.index] = replacement;
  return next;
}

/** Remove a node by uid; returns the new tree + the removed node (for moves). */
export function removeByUid(tree: AstTree, uid: string): { tree: AstTree; removed: AnyNode | null } {
  const next = clone(tree);
  const loc = locate(next, uid);
  if (!loc) return { tree: next, removed: null };
  const [removed] = loc.parentArray.splice(loc.index, 1);
  return { tree: next, removed };
}

/** Insert a child (element or nested row) into a column at an index. */
export function insertIntoColumn(tree: AstTree, columnUid: string, child: ColumnChild, atIndex?: number): AstTree {
  const next = clone(tree);
  walk(next, (n) => {
    if (n.uid === columnUid && n.kind === "column") {
      const at = atIndex == null ? n.children.length : Math.max(0, Math.min(atIndex, n.children.length));
      n.children.splice(at, 0, child);
      return false;
    }
  });
  return next;
}

/** Insert a row into a section at an index. */
export function insertRowInSection(tree: AstTree, sectionUid: string, row: RowNode, atIndex?: number): AstTree {
  const next = clone(tree);
  walk(next, (n) => {
    if (n.uid === sectionUid && n.kind === "section") {
      const at = atIndex == null ? n.rows.length : Math.max(0, Math.min(atIndex, n.rows.length));
      n.rows.splice(at, 0, row);
      return false;
    }
  });
  return next;
}

/** Insert a top-level section at an index. */
export function insertSection(tree: AstTree, section: SectionNode, atIndex?: number): AstTree {
  const next = clone(tree);
  const at = atIndex == null ? next.length : Math.max(0, Math.min(atIndex, next.length));
  next.splice(at, 0, section);
  return next;
}

/** Reorder top-level sections (drag-sort). */
export function reorderSections(tree: AstTree, fromIndex: number, toIndex: number): AstTree {
  const next = clone(tree);
  if (fromIndex < 0 || fromIndex >= next.length) return next;
  const [moved] = next.splice(fromIndex, 1);
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
  return next;
}

/**
 * Move any node (element or nested row) by uid into a target column at an index.
 * Handles same-array index shift (removing before re-inserting). Returns the
 * new tree (no-op if source/target not found).
 */
export function moveIntoColumn(tree: AstTree, sourceUid: string, targetColumnUid: string, atIndex: number): AstTree {
  const { tree: without, removed } = removeByUid(tree, sourceUid);
  if (!removed || (removed.kind !== "element" && removed.kind !== "row")) return tree;
  // adjust index if removing from the same target column before the insert point
  let idx = atIndex;
  const tgt = findByUid(without, targetColumnUid);
  if (tgt && tgt.kind === "column") {
    // (the removed node is already gone, so atIndex is relative to the post-remove array)
    idx = Math.max(0, Math.min(atIndex, tgt.children.length));
  }
  return insertIntoColumn(without, targetColumnUid, removed as ColumnChild, idx);
}

/** Duplicate a node by uid (fresh uids assigned to the clone subtree). */
export function duplicateByUid(tree: AstTree, uid: string): AstTree {
  const loc = locate(clone(tree), uid);
  if (!loc) return tree;
  const next = clone(tree);
  const here = locate(next, uid)!;
  const copy = withFreshUids(clone(here.node));
  here.parentArray.splice(here.index + 1, 0, copy);
  return next;
}

/** Recursively assign new uids to a node subtree (for duplicate/paste). */
export function withFreshUids<T extends AnyNode>(node: T): T {
  const n: any = node;
  n.uid = newUid();
  if (n.kind === "section") n.rows = n.rows.map(withFreshUids);
  else if (n.kind === "row") n.columns = n.columns.map(withFreshUids);
  else if (n.kind === "column") n.children = n.children.map(withFreshUids);
  return n;
}

/** Set a row's column count, adding empty columns or trimming, re-normalising widths. */
export function setRowColumns(tree: AstTree, rowUid: string, count: number): AstTree {
  const n = Math.max(1, Math.min(12, count));
  const next = clone(tree);
  walk(next, (node) => {
    if (node.uid === rowUid && node.kind === "row") {
      while (node.columns.length < n) node.columns.push({ uid: newUid(), kind: "column", props: {}, children: [] });
      if (node.columns.length > n) node.columns.length = n;
      node.widths = Array.from({ length: n }, () => 1 / n);
      return false;
    }
  });
  return next;
}

/** Resize columns: drag the divider between column i and i+1 by a fractional delta. */
export function resizeRowDivider(tree: AstTree, rowUid: string, dividerIndex: number, deltaRatio: number): AstTree {
  const MIN = 0.05;
  const next = clone(tree);
  walk(next, (node) => {
    if (node.uid === rowUid && node.kind === "row") {
      const cols = node.columns.length;
      let w = Array.isArray(node.widths) && node.widths.length === cols ? node.widths.slice() : Array.from({ length: cols }, () => 1 / cols);
      const i = dividerIndex, j = dividerIndex + 1;
      if (j < cols) {
        const pair = w[i] + w[j];
        w[i] = Math.min(Math.max(MIN, w[i] + deltaRatio), pair - MIN);
        w[j] = pair - w[i];
        const sum = w.reduce((s, x) => s + x, 0) || 1;
        node.widths = w.map((x) => x / sum);
      }
      return false;
    }
  });
  return next;
}

/** Convenience constructors. */
export function makeColumn(): ColumnNode {
  return { uid: newUid(), kind: "column", props: {}, children: [] };
}
export function makeRowNode(columns: number): RowNode {
  const n = Math.max(1, Math.min(12, columns));
  return { uid: newUid(), kind: "row", props: {}, columns: Array.from({ length: n }, makeColumn), widths: Array.from({ length: n }, () => 1 / n) };
}
export function makeSection(rows?: RowNode[]): SectionNode {
  return { uid: newUid(), kind: "section", props: { _wrapper: {} }, rows: rows ?? [makeRowNode(1)] };
}
export function makeElement(type: string, props: Record<string, any> = {}): ElementNode {
  return { uid: newUid(), kind: "element", type, props };
}
