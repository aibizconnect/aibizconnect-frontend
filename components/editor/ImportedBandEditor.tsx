"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { applyPatches, type ImportedPatch } from "@/lib/sites/lossless-importer";

/**
 * Editor for a LOSSLESS imported band (architect D-178..D-183, Copilot-ratified UX).
 *
 * The band's REAL HTML renders inside an IFRAME (D-181 — its CSS can never bleed into the
 * dashboard), with the page's compiled-CSS snapshot injected. Clicking any element in the canvas
 * selects it (stable data-uid, D-179) and the LAYER TREE rail mirrors the selection — every
 * element of the design, top-to-bottom, exactly as imported.
 *
 * Edits never touch the original HTML: each change is a PATCH {op, uid, …} applied at render.
 * The "Edits" list shows every patch with one-click revert (Copilot: patches must be visible and
 * auditable, not silently folded into the canvas).
 */

type Content = { type: "imported-html"; html: string; patches?: ImportedPatch[]; _name?: string };
let cloneSeq = 0; // per-session counter for duplicate cloneIds (deterministic enough + unique)

type TreeNode = { uid: string; tag: string; label: string; children: TreeNode[]; depth: number };

const HIGHLIGHT = "outline:2px solid #2563eb;outline-offset:-2px";

function buildTree(html: string): TreeNode | null {
  if (typeof window === "undefined") return null;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const rootEl = doc.getElementById("__root")?.firstElementChild;
  if (!rootEl) return null;
  // Friendly node names (architect D-187): semantic kind first, content snippet second —
  // "Heading · Ottawa mortgages…" beats "h2.font-headline-lg" for non-technical editing.
  const KIND: Record<string, string> = {
    h1: "Heading", h2: "Heading", h3: "Heading", h4: "Heading", h5: "Heading", h6: "Heading",
    p: "Text", span: "Text", img: "Image", a: "Link", button: "Button", nav: "Menu",
    form: "Form", input: "Field", textarea: "Field", label: "Label", ul: "List", ol: "List", li: "Item",
    section: "Section", header: "Header", footer: "Footer", svg: "Icon",
  };
  const walk = (el: Element, depth: number): TreeNode | null => {
    const uid = el.getAttribute("data-uid");
    const kids: TreeNode[] = [];
    for (const c of Array.from(el.children)) { const n = walk(c, depth + 1); if (n) kids.push(n); }
    if (!uid) return kids.length === 1 ? kids[0] : null; // skip unstamped wrappers
    const tag = el.tagName.toLowerCase();
    const cls = el.getAttribute("class") || "";
    const isIcon = /material-symbols|material-icons/.test(cls);
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    const kind = isIcon ? "Icon" : KIND[tag] || (kids.length ? "Container" : "Element");
    const snippet = tag === "img" ? (el.getAttribute("alt") || "").slice(0, 24) : isIcon ? text.slice(0, 16) : text.slice(0, 26);
    const label = snippet ? `${kind} · ${snippet}` : kind;
    return { uid, tag, label, children: kids, depth };
  };
  return walk(rootEl, 0);
}

/** Find an element + its editable facts inside the PATCHED document (so fields prefill current values).
 *  COMPOSITES (D-193): a <ul>/<ol> carries its items (with each <li>'s uid), a <form> carries its
 *  fields (input + sibling-label uids) and submit button — so they project as our full Bullet-List /
 *  Contact-Form elements instead of a pile of small text nodes. */
export function nodeFacts(html: string, uid: string) {
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const el = doc.querySelector(`[data-uid="${uid}"]`);
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const hasElementChildren = el.children.length > 0;
  const clean = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();

  let items: { uid: string; text: string }[] | undefined;
  if (tag === "ul" || tag === "ol") {
    items = Array.from(el.children)
      .filter((c) => c.tagName.toLowerCase() === "li" && c.getAttribute("data-uid"))
      .map((li) => ({ uid: li.getAttribute("data-uid")!, text: clean(li.textContent) }));
  }

  // MENU recognition — DIV PROTOCOL (Ali): a Menu is the LINKS GROUP — a container whose direct
  // children are mostly links — NOT the whole <nav> (that's the header Row: logo | menu | button).
  let menuItems: { uid: string; label: string; href: string; children: { uid: string; label: string; href: string }[] }[] | undefined;
  {
    const kidsEls = Array.from(el.children);
    const hosts = kidsEls.filter((c) => ["a", "li"].includes(c.tagName.toLowerCase()));
    const isMenuGroup = kidsEls.length >= 2 && hosts.length >= 2 && hosts.length >= Math.ceil(kidsEls.length * 0.8);
    if (isMenuGroup) {
      menuItems = [];
      for (const host of hosts) {
        const a = host.tagName.toLowerCase() === "a" ? host : host.querySelector("a");
        if (!a?.getAttribute("data-uid")) continue;
        const label = clean(a.childNodes[0]?.textContent || a.textContent);
        if (!label || /^[a-z][a-z0-9_]*$/.test(label)) continue; // skip icon ligature links
        const children = Array.from(host.querySelectorAll("ul a"))
          .filter((c) => c.getAttribute("data-uid"))
          .map((c) => ({ uid: c.getAttribute("data-uid")!, label: clean(c.textContent), href: c.getAttribute("href") || "#" }));
        menuItems.push({ uid: a.getAttribute("data-uid")!, label: label.slice(0, 40), href: a.getAttribute("href") || "#", children });
      }
      if (menuItems.length < 2) menuItems = undefined;
    }
  }

  let fields: { uid: string; labelUid: string | null; label: string; type: string; placeholder: string }[] | undefined;
  let submit: { uid: string; label: string } | undefined;
  if (tag === "form") {
    fields = [];
    for (const inp of Array.from(el.querySelectorAll("input, textarea, select"))) {
      const itype = (inp.getAttribute("type") || (inp.tagName.toLowerCase() === "textarea" ? "textarea" : "text")).toLowerCase();
      if (["submit", "button", "hidden", "checkbox", "radio", "image", "file"].includes(itype)) continue;
      // sibling <label> within up to 2 ancestors (Stitch wraps label+input in a field div, D-170)
      let labelEl: Element | null = null;
      let p: Element | null = inp.parentElement;
      for (let i = 0; i < 2 && p && !labelEl; i++) { labelEl = Array.from(p.children).find((c) => c.tagName.toLowerCase() === "label") ?? null; p = p.parentElement; }
      fields.push({
        uid: inp.getAttribute("data-uid") || "",
        labelUid: labelEl?.getAttribute("data-uid") || null,
        label: clean(labelEl?.textContent) || clean(inp.getAttribute("placeholder")),
        type: itype === "email" ? "email" : itype === "tel" ? "tel" : inp.tagName.toLowerCase() === "textarea" ? "textarea" : "text",
        placeholder: inp.getAttribute("placeholder") || "",
      });
    }
    const sub = el.querySelector('button[type="submit"], input[type="submit"], button');
    if (sub?.getAttribute("data-uid")) submit = { uid: sub.getAttribute("data-uid")!, label: clean(sub.textContent) || "Send" };
  }

  return {
    uid,
    tag,
    text: hasElementChildren ? null : (el.textContent || ""),
    src: tag === "img" ? el.getAttribute("src") || "" : null,
    alt: tag === "img" ? el.getAttribute("alt") || "" : null,
    href: tag === "a" ? el.getAttribute("href") || "" : null,
    // computed styles the bridge captured — prefills the projected element's inspector (D-188)
    dataCs: el.getAttribute("data-cs"),
    items,
    fields,
    submit,
    menuItems,
  };
}

export default function ImportedBandEditor({
  content, css, fontHrefs = [], selected, onChange, onNodeSelect, externalSelUid,
}: {
  content: Content;
  /** The page's imported-css snapshot — injected ONLY into the iframe document. */
  css: string;
  /** Font stylesheet links (Google Fonts / icon fonts) — without them, Material Symbols
   *  ligatures render as their WORDS ("home","share") instead of glyphs. */
  fontHrefs?: string[];
  selected: boolean;
  onChange: (next: Content) => void;
  /** Reports the selected node's facts UP so the RIGHT panel can edit it as a projected
   *  native element (D-188) — <img> edits as Image, <h2> as Heading, <a> as Button. */
  onNodeSelect?: (sel: { uid: string; facts: NonNullable<ReturnType<typeof nodeFacts>> } | null) => void;
  /** Controlled selection from OUTSIDE (the Layers tree) — syncs the in-band highlight. */
  externalSelUid?: string | null;
}) {
  const patches = useMemo(() => (Array.isArray(content.patches) ? content.patches : []), [content.patches]);
  const patchedHtml = useMemo(() => applyPatches(content.html || "", patches), [content.html, patches]);
  const [sel, setSel] = useState<string | null>(null);
  const [height, setHeight] = useState(160);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // The iframe's listeners are wired once per srcDoc; route their commits through a ref so they
  // always reach the CURRENT setPatch (patches change between wires).
  const setPatchRef = useRef<(p: ImportedPatch) => void>(() => {});
  const tree = useMemo(() => buildTree(patchedHtml), [patchedHtml]);
  const facts = useMemo(() => (sel ? nodeFacts(patchedHtml, sel) : null), [patchedHtml, sel]);

  // Report selection upward so the standard RIGHT inspector edits the node as a projected
  // native element (D-188). Re-fires when patches change so the inspector prefills fresh values.
  useEffect(() => {
    onNodeSelect?.(sel && facts ? { uid: sel, facts } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, facts]);

  // Layers-tree → canvas: an external selection (tree click) drives the in-band highlight.
  useEffect(() => {
    if (externalSelUid !== undefined && externalSelUid !== null && externalSelUid !== sel) setSel(externalSelUid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalSelUid]);

  const srcDoc = useMemo(() =>
    `<!doctype html><html><head><meta charset="utf-8">${fontHrefs.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}<style>${css}</style><style>html,body{margin:0;background:transparent}[data-uid]{cursor:default}</style></head><body>${patchedHtml}</body></html>`,
  [css, fontHrefs, patchedHtml]);

  // Same-origin srcDoc iframe: measure height + wire click-to-select + selection highlight.
  useEffect(() => {
    const f = iframeRef.current;
    if (!f) return;
    let alive = true;
    const doc = () => f.contentDocument;
    const measure = () => { const d = doc(); if (alive && d?.body) setHeight(Math.max(80, d.body.scrollHeight)); };
    const wire = () => {
      const d = doc();
      if (!d) return;
      d.addEventListener("click", (e) => {
        const t = (e.target as Element)?.closest?.("[data-uid]");
        // While a node is being text-edited, let clicks place the caret normally.
        if ((e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault(); e.stopPropagation();
        if (t) setSel(t.getAttribute("data-uid"));
      }, true);
      // IN-CANVAS DIRECT TEXT EDITING (D-184/185): double-click a text leaf → type in place →
      // blur commits a {op:"text"} patch. No tree hunting for simple copy changes. Works in the
      // sandboxed iframe because contentEditable is browser UI, not frame scripting.
      d.addEventListener("dblclick", (e) => {
        const t = (e.target as Element)?.closest?.("[data-uid]") as HTMLElement | null;
        if (!t || t.children.length > 0) return; // text leaves only
        e.preventDefault(); e.stopPropagation();
        const uid = t.getAttribute("data-uid")!;
        const original = t.textContent || "";
        t.setAttribute("contenteditable", "true");
        t.focus();
        const commit = () => {
          t.removeAttribute("contenteditable");
          const v = t.textContent || "";
          if (v !== original) setPatchRef.current({ op: "text", uid, value: v });
        };
        t.addEventListener("blur", commit, { once: true });
        t.addEventListener("keydown", (ke: KeyboardEvent) => {
          if (ke.key === "Escape") { t.textContent = original; t.blur(); }
          if (ke.key === "Enter" && !ke.shiftKey && t.tagName !== "P") { ke.preventDefault(); t.blur(); }
        });
        setSel(uid);
      }, true);
      // Affordance: text leaves show a text cursor on hover.
      try { const s = d.createElement("style"); s.textContent = "[data-uid]:not(:has(*)):hover{cursor:text;outline:1px dashed #93c5fd;outline-offset:-1px}"; d.head.appendChild(s); } catch { /* optional */ }
      measure();
      // late images/fonts shift layout — re-measure a few times
      setTimeout(measure, 300); setTimeout(measure, 1200); setTimeout(measure, 3000);
    };
    if (f.contentDocument?.readyState === "complete") wire();
    f.addEventListener("load", wire);
    return () => { alive = false; f.removeEventListener("load", wire); };
  }, [srcDoc]);

  // Selection highlight inside the iframe.
  useEffect(() => {
    const d = iframeRef.current?.contentDocument;
    if (!d) return;
    for (const el of Array.from(d.querySelectorAll("[data-abc-sel]"))) { el.removeAttribute("data-abc-sel"); (el as HTMLElement).style.outline = ""; }
    if (sel) { const el = d.querySelector(`[data-uid="${sel}"]`) as HTMLElement | null; if (el) { el.setAttribute("data-abc-sel", "1"); el.style.cssText += `;${HIGHLIGHT}`; el.scrollIntoView({ block: "nearest" }); } }
  }, [sel, srcDoc]);

  /** Record a patch — the original html is never mutated. Content ops (text/image/link/hide)
   *  UPSERT per uid+op; `style` merges keys; structural ops (move/duplicate/remove) APPEND in
   *  order, so two "move up" clicks really move two steps and stay individually revertible. */
  const setPatch = (p: ImportedPatch) => {
    let next: ImportedPatch[];
    if (p.op === "move" || p.op === "duplicate" || p.op === "remove") {
      next = [...patches, p];
    } else if (p.op === "style") {
      const prev = patches.find((x) => x.uid === p.uid && x.op === "style") as Extract<ImportedPatch, { op: "style" }> | undefined;
      next = patches.filter((x) => !(x.uid === p.uid && x.op === "style"));
      next.push({ op: "style", uid: p.uid, style: { ...(prev?.style || {}), ...p.style } });
    } else {
      next = patches.filter((x) => !(x.uid === p.uid && x.op === p.op));
      next.push(p);
    }
    onChange({ ...content, patches: next });
  };
  setPatchRef.current = setPatch;
  const revertPatch = (i: number) => onChange({ ...content, patches: patches.filter((_, idx) => idx !== i) });

  const Tree = ({ n }: { n: TreeNode }) => (
    <div style={{ paddingLeft: n.depth ? 10 : 0 }}>
      <button
        onClick={() => setSel(n.uid)}
        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-4 ${sel === n.uid ? "bg-blue-100 text-blue-900" : "text-slate-600 hover:bg-slate-100"}`}
        title={`${n.tag} — ${n.label}`}
      >
        {n.label}
      </button>
      {n.children.map((c) => <Tree key={c.uid} n={c} />)}
    </div>
  );

  return (
    <div className="flex gap-2">
      {/* EDITS audit list only — the ONE Layer Tree lives in the left Layers panel (Ali: no
          duplicate, worse tree inside the band). Node fields/actions live in the right panel. */}
      {selected && patches.length > 0 && (
        <div className="w-60 shrink-0 space-y-2 self-start rounded-lg border border-slate-200 bg-white p-2">
          {patches.length > 0 && (
            <div className="space-y-1 border-t border-slate-100 pt-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Edits ({patches.length})</div>
              {patches.map((p, i) => (
                <div key={i} className="flex items-center gap-1 px-1 text-[11px] text-slate-600">
                  <button className="truncate text-left hover:underline" onClick={() => setSel(p.uid)} title={JSON.stringify(p)}>
                    {p.op} · {p.uid}{(p as any).value ? ` → "${String((p as any).value).slice(0, 16)}"` : ""}
                  </button>
                  <button className="ml-auto rounded px-1 text-red-500 hover:bg-red-50" title="Revert this edit" onClick={() => revertPatch(i)}>↺</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The band itself — REAL imported HTML in an isolated iframe (D-181). */}
      <iframe
        ref={iframeRef}
        title={content._name || "Imported band"}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        className="w-full min-w-0 rounded border-0 bg-white"
        style={{ height }}
      />
    </div>
  );
}
