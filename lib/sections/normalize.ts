/**
 * Phase-2 canonical block contract — the SAFE, additive slice (architect D-114/115/116).
 *
 * We deliberately do NOT restructure per-type `content` (the architect's full spec nests
 * content.hero.heading.text_style etc., which would risk every saved page). Instead this is a
 * read-time normalizer that:
 *   - guarantees a stable `id` on every block (and nested row columns/blocks),
 *   - surfaces a canonical `meta` view over the existing underscore keys (_name/_kind/_style/
 *     _anim/_styleToken) WITHOUT removing them, so all current content access keeps working,
 *   - never writes back to the DB (pure, idempotent).
 *
 * It is the foundation the generative pipeline (Phase 3) composes against. Legacy blocks pass
 * through unchanged except for the additive fields, so editor = preview = public stays intact.
 */

export type BlockKind = "header" | "footer" | undefined;

export interface BlockMeta {
  /** Human-readable name (from legacy `_name`). */
  name?: string;
  /** Structural role (from legacy `_kind`). */
  kind: BlockKind;
  /** Header/Footer blocks are global (shared across pages). */
  isGlobal: boolean;
  /** `html` snapshots are not field-editable; everything else is. */
  isEditable: boolean;
  /** Canonical design token this block references (from legacy `_styleToken`), if any. */
  styleToken?: string;
}

let _counter = 0;
/** Deterministic-ish id that is safe in both server and client (no crypto dependency). */
function makeId(seed: string): string {
  _counter = (_counter + 1) % 1_000_000;
  return `blk_${seed}_${_counter.toString(36)}`;
}

/** Derive the canonical metadata view from a raw block's existing underscore keys. */
export function blockMeta(raw: any): BlockMeta {
  const kind = (raw?._kind === "header" || raw?._kind === "footer") ? raw._kind : undefined;
  return {
    name: typeof raw?._name === "string" ? raw._name : undefined,
    kind,
    isGlobal: kind === "header" || kind === "footer",
    isEditable: raw?.type !== "html",
    styleToken: typeof raw?._styleToken === "string" && raw._styleToken ? raw._styleToken : undefined,
  };
}

/**
 * Normalize a raw block to the canonical (additive) shape. Returns a NEW object; the original
 * is never mutated. All legacy keys are preserved so existing renderers/inspectors are unaffected.
 */
export function normalizeBlock(raw: any, seed = "x"): any {
  if (!raw || typeof raw !== "object") return raw;
  const id = typeof raw.id === "string" && raw.id ? raw.id : makeId(seed);
  const out: any = { ...raw, id, _meta: blockMeta(raw) };

  // Recurse into rows so every column + nested block also gets a guaranteed id.
  const cols = Array.isArray(raw.columns) ? raw.columns : null;
  if (raw.type === "row" && cols) {
    out.columns = cols.map((col: any, ci: number) => {
      const colId = typeof col?.id === "string" && col.id ? col.id : makeId(`${seed}c${ci}`);
      const blocks = Array.isArray(col?.blocks) ? col.blocks : [];
      return { ...col, id: colId, blocks: blocks.map((b: any, bi: number) => normalizeBlock(b, `${seed}c${ci}b${bi}`)) };
    });
  }
  return out;
}

/**
 * Resolve a canonical style_token to its CSS value via the Phase-1 --abc-* variables
 * (architect RULING 111-revised / 115). Returns a `var(--abc-*)` reference so it re-themes in
 * one shot, or undefined for an unknown token (caller keeps its literal). Pure, no allocation
 * of new tokens — reuses the vocabulary tokensToCssVars already emits.
 */
export function resolveStyleToken(token?: string): string | undefined {
  if (!token || typeof token !== "string") return undefined;
  const t = token.trim();
  // color-*  → var(--abc-color-*)   (color-error aliases danger for parity with the vocabulary)
  const color = /^color-([a-z]+)$/.exec(t);
  if (color) {
    const name = color[1] === "error" ? "danger" : color[1];
    return `var(--abc-color-${name})`;
  }
  const font = /^font-(heading|body|display-brand)$/.exec(t);
  if (font) return `var(--abc-font-${font[1]})`;
  const size = /^font-size-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl)$/.exec(t);
  if (size) return `var(--abc-font-size-${size[1]})`;
  const space = /^space-(xs|sm|md|lg|xl|2xl|3xl)$/.exec(t);
  if (space) return `var(--abc-space-${space[1]})`;
  const radius = /^(?:radius|rounded)-(sm|md|lg|full)$/.exec(t);
  if (radius) return `var(--abc-radius-${radius[1]})`;
  const shadow = /^shadow-(sm|md|lg)$/.exec(t);
  if (shadow) return `var(--abc-shadow-${shadow[1]})`;
  return undefined;
}
