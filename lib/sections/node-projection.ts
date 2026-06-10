import type { ImportedPatch } from "@/lib/sites/lossless-importer";
import { parseDataCs } from "@/lib/sites/style-capture";

/**
 * ELEMENT PROJECTION (architect D-188): a selected node inside a lossless imported band is
 * PROJECTED into one of our native element content objects — <img> IS the Image element,
 * <h2> IS a Heading, <a> IS a Button — so the standard right-panel inspector (SectionEditor)
 * edits it exactly like a native element. Edits are DIFFED back into patches over the immutable
 * imported HTML; conversion never happens (projection is a view, D-178 stays intact).
 */

export type NodeFacts = {
  uid: string;
  tag: string;
  /** textContent when the node is a text leaf (no element children), else null. */
  text: string | null;
  src: string | null;
  alt: string | null;
  href: string | null;
  /** the bridge-captured computed styles of this node (data-cs). */
  dataCs: string | null;
  /** COMPOSITES (D-193): <ul>/<ol> items with per-<li> uids. */
  items?: { uid: string; text: string }[];
  /** <form> fields (input + sibling-label uids) + submit button. */
  fields?: { uid: string; labelUid: string | null; label: string; type: string; placeholder: string }[];
  submit?: { uid: string; label: string };
};

const H = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const TEXTY = new Set(["p", "span", "li", "blockquote", "figcaption", "label", "div", "em", "strong", "small"]);

/** Project a DOM node's facts into native element content (or null when nothing maps). */
export function projectNode(f: NodeFacts): Record<string, unknown> | null {
  const { typo, style } = parseDataCs(f.dataCs);
  const base: Record<string, unknown> = {};
  if (typo.color) base.color = typo.color;
  if (typo.fontSize) base.fontSize = typo.fontSize;
  if (typo.fontWeight) base.fontWeight = typo.fontWeight;
  if (typo.align) base.align = typo.align;
  if (typo.fontFamily) base.fontFamily = typo.fontFamily;

  // COMPOSITES first (D-193): full-size element inspectors for lists, forms, stat counters.
  if ((f.tag === "ul" || f.tag === "ol") && f.items?.length) {
    return { type: "bullet-list", items: f.items.map((i) => ({ text: i.text })), bulletStyle: f.tag === "ol" ? "number" : "disc", ...(typo.color ? { color: typo.color } : {}) };
  }
  if (f.tag === "form" && f.fields?.length) {
    return {
      type: "contact-form",
      heading: "",
      fields: f.fields.map((fd, i) => ({ name: fd.type === "email" ? "email" : fd.type === "tel" ? "phone" : fd.type === "textarea" ? "message" : i === 0 ? "name" : `field_${i + 1}`, label: fd.label, type: fd.type })),
      submitLabel: f.submit?.label || "Send",
      ...(style.bg ? { submitColor: style.bg } : {}),
    };
  }
  // A big standalone number ("500+", "5.0") → our Number-Counter element.
  if (f.text != null && /^[\d][\d,.]*\s*[+%]?$/.test(f.text.trim()) && (typo.fontSize as number || 0) >= 24) {
    const m = /^([\d][\d,.]*)\s*([+%]?)$/.exec(f.text.trim())!;
    return { type: "number-counter", value: m[1], suffix: m[2] || "", __origText: f.text.trim(), ...base };
  }
  if (f.tag === "img") {
    const out: Record<string, unknown> = { type: "image", url: f.src || "", alt: f.alt || "" };
    if (typeof style.radius === "number") out.rounding = style.radius;
    return out;
  }
  if (H.has(f.tag)) {
    return { type: "heading", text: f.text ?? "", level: f.tag, ...base };
  }
  if (f.tag === "a" || f.tag === "button") {
    const out: Record<string, unknown> = { type: "button", label: (f.text ?? "").slice(0, 80), href: f.href || "#" };
    if (style.bg) { out.bgColor = style.bg; out.variant = "solid"; }
    if (typo.color) out.textColor = typo.color;
    if (typeof style.radius === "number") out.radius = style.radius;
    return out;
  }
  if (f.text != null && TEXTY.has(f.tag)) {
    return { type: "text", text: f.text, ...base };
  }
  return null;
}

/** CSS property for each projected style field (D-189: anything unmapped is simply ignored). */
const STYLE_CSS: Record<string, (v: unknown) => [string, string] | null> = {
  color: (v) => (typeof v === "string" && v ? ["color", v] : null),
  textColor: (v) => (typeof v === "string" && v ? ["color", v] : null),
  bgColor: (v) => (typeof v === "string" && v ? ["background-color", v] : null),
  fontSize: (v) => (v != null && v !== "" ? ["font-size", `${v}px`] : null),
  fontWeight: (v) => (v != null && v !== "" ? ["font-weight", String(v)] : null),
  align: (v) => (typeof v === "string" && v ? ["text-align", v] : null),
  fontFamily: (v) => (typeof v === "string" && v ? ["font-family", v] : null),
  rounding: (v) => (v != null && v !== "" ? ["border-radius", `${v}px`] : null),
  radius: (v) => (v != null && v !== "" ? ["border-radius", `${v}px`] : null),
  width: (v) => (v != null && v !== "" ? ["width", `${v}px`] : null),
  italic: (v) => ["font-style", v ? "italic" : "normal"],
  letterSpacing: (v) => (v != null && v !== "" ? ["letter-spacing", `${v}px`] : null),
  lineHeight: (v) => (v != null && v !== "" ? ["line-height", String(v)] : null),
};

/** Diff a projected element edit into patches against the node `uid` (facts carry child uids for composites). */
export function diffToPatches(prev: Record<string, unknown>, next: Record<string, unknown>, uid: string, facts?: NodeFacts): ImportedPatch[] {
  const out: ImportedPatch[] = [];

  // COMPOSITE diff-back (D-193): list items / form labels map to their CHILD node uids.
  if (next.type === "bullet-list" && facts?.items) {
    const prevItems = (prev.items as { text: string }[]) || [];
    const nextItems = (next.items as { text: string }[]) || [];
    const n = Math.min(facts.items.length, nextItems.length);
    for (let i = 0; i < n; i++) {
      if (nextItems[i]?.text !== prevItems[i]?.text) out.push({ op: "text", uid: facts.items[i].uid, value: nextItems[i].text });
    }
    for (let i = nextItems.length; i < facts.items.length; i++) out.push({ op: "remove", uid: facts.items[i].uid }); // items deleted in inspector
    const last = facts.items[facts.items.length - 1];
    for (let i = facts.items.length; i < nextItems.length; i++) { // items added in inspector → clone the last <li>, then set its text
      const cloneId = `c${i}${Math.abs(hashCode(nextItems[i]?.text || String(i)))}`;
      out.push({ op: "duplicate", uid: last.uid, cloneId });
      out.push({ op: "text", uid: `${last.uid}.${cloneId}`, value: nextItems[i].text });
    }
    return out;
  }
  if (next.type === "contact-form" && facts?.fields) {
    const prevFields = (prev.fields as { label: string }[]) || [];
    const nextFields = (next.fields as { label: string }[]) || [];
    for (let i = 0; i < Math.min(facts.fields.length, nextFields.length); i++) {
      if (nextFields[i]?.label !== prevFields[i]?.label && facts.fields[i].labelUid) {
        out.push({ op: "text", uid: facts.fields[i].labelUid!, value: nextFields[i].label });
      }
    }
    if (facts.submit && typeof next.submitLabel === "string" && next.submitLabel !== prev.submitLabel) {
      out.push({ op: "text", uid: facts.submit.uid, value: next.submitLabel });
    }
    if (facts.submit && typeof next.submitColor === "string" && next.submitColor !== prev.submitColor) {
      out.push({ op: "style", uid: facts.submit.uid, style: { "background-color": next.submitColor } });
    }
    return out;
  }
  if (next.type === "number-counter") {
    const t = `${next.prefix ?? ""}${next.value ?? ""}${next.suffix ?? ""}`.trim();
    if (t && t !== prev.__origText) out.push({ op: "text", uid, value: t });
    return out;
  }

  const textKey = next.type === "button" ? "label" : "text";
  if (typeof next[textKey] === "string" && next[textKey] !== prev[textKey]) {
    out.push({ op: "text", uid, value: String(next[textKey]) });
  }
  if (next.type === "image" && (next.url !== prev.url || next.alt !== prev.alt)) {
    out.push({ op: "image", uid, src: String(next.url || prev.url || ""), alt: typeof next.alt === "string" ? next.alt : undefined });
  }
  if (next.type === "button" && typeof next.href === "string" && next.href !== prev.href) {
    out.push({ op: "link", uid, href: next.href });
  }
  const style: Record<string, string> = {};
  for (const [key, toCss] of Object.entries(STYLE_CSS)) {
    if (next[key] === prev[key]) continue;
    const mapped = toCss(next[key]);
    if (mapped) style[mapped[0]] = mapped[1];
  }
  if (Object.keys(style).length) out.push({ op: "style", uid, style });
  return out;
}

/** Deterministic small hash for clone ids (no Date dependency — stable across re-renders). */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}

/** Merge new patches into a band's patch list (content ops upsert, style merges keys). */
export function mergePatches(existing: ImportedPatch[], add: ImportedPatch[]): ImportedPatch[] {
  let next = [...existing];
  for (const p of add) {
    if (p.op === "style") {
      const prev = next.find((x) => x.uid === p.uid && x.op === "style") as Extract<ImportedPatch, { op: "style" }> | undefined;
      next = next.filter((x) => !(x.uid === p.uid && x.op === "style"));
      next.push({ op: "style", uid: p.uid, style: { ...(prev?.style || {}), ...p.style } });
    } else if (p.op === "move" || p.op === "duplicate" || p.op === "remove") {
      next.push(p);
    } else {
      next = next.filter((x) => !(x.uid === p.uid && x.op === p.op));
      next.push(p);
    }
  }
  return next;
}
