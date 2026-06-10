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

type TreeNode = { uid: string; tag: string; label: string; children: TreeNode[]; depth: number };

const HIGHLIGHT = "outline:2px solid #2563eb;outline-offset:-2px";

function buildTree(html: string): TreeNode | null {
  if (typeof window === "undefined") return null;
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const rootEl = doc.getElementById("__root")?.firstElementChild;
  if (!rootEl) return null;
  const walk = (el: Element, depth: number): TreeNode | null => {
    const uid = el.getAttribute("data-uid");
    const kids: TreeNode[] = [];
    for (const c of Array.from(el.children)) { const n = walk(c, depth + 1); if (n) kids.push(n); }
    if (!uid) return kids.length === 1 ? kids[0] : null; // skip unstamped wrappers
    const tag = el.tagName.toLowerCase();
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    const cls = (el.getAttribute("class") || "").split(/\s+/).filter((c) => c && !/^(flex|grid|relative|absolute|hidden|md:|lg:|sm:)/.test(c))[0];
    const label = tag === "img" ? "image" : text ? text.slice(0, 28) : cls ? `${tag}.${cls.slice(0, 18)}` : tag;
    return { uid, tag, label, children: kids, depth };
  };
  return walk(rootEl, 0);
}

/** Find an element + its editable facts inside the PATCHED document (so fields prefill current values). */
function nodeFacts(html: string, uid: string) {
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const el = doc.querySelector(`[data-uid="${uid}"]`);
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const hasElementChildren = el.children.length > 0;
  return {
    tag,
    text: hasElementChildren ? null : (el.textContent || ""),
    src: tag === "img" ? el.getAttribute("src") || "" : null,
    alt: tag === "img" ? el.getAttribute("alt") || "" : null,
    href: tag === "a" ? el.getAttribute("href") || "" : null,
  };
}

export default function ImportedBandEditor({
  content, css, selected, onChange,
}: {
  content: Content;
  /** The page's imported-css snapshot — injected ONLY into the iframe document. */
  css: string;
  selected: boolean;
  onChange: (next: Content) => void;
}) {
  const patches = useMemo(() => (Array.isArray(content.patches) ? content.patches : []), [content.patches]);
  const patchedHtml = useMemo(() => applyPatches(content.html || "", patches), [content.html, patches]);
  const [sel, setSel] = useState<string | null>(null);
  const [height, setHeight] = useState(160);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tree = useMemo(() => buildTree(patchedHtml), [patchedHtml]);
  const facts = useMemo(() => (sel ? nodeFacts(patchedHtml, sel) : null), [patchedHtml, sel]);

  const srcDoc = useMemo(() =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style><style>html,body{margin:0;background:transparent}[data-uid]{cursor:default}</style></head><body>${patchedHtml}</body></html>`,
  [css, patchedHtml]);

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
        e.preventDefault(); e.stopPropagation();
        if (t) setSel(t.getAttribute("data-uid"));
      }, true);
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

  /** Upsert a patch (one per uid+op) — the original html is never mutated. */
  const setPatch = (p: ImportedPatch) => {
    const next = patches.filter((x) => !(x.uid === p.uid && x.op === p.op));
    next.push(p);
    onChange({ ...content, patches: next });
  };
  const revertPatch = (i: number) => onChange({ ...content, patches: patches.filter((_, idx) => idx !== i) });

  const Tree = ({ n }: { n: TreeNode }) => (
    <div style={{ paddingLeft: n.depth ? 10 : 0 }}>
      <button
        onClick={() => setSel(n.uid)}
        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-4 ${sel === n.uid ? "bg-blue-100 text-blue-900" : "text-slate-600 hover:bg-slate-100"}`}
        title={`${n.tag} — ${n.label}`}
      >
        <span className="mr-1 font-mono text-[10px] text-slate-400">{n.tag}</span>{n.label}
      </button>
      {n.children.map((c) => <Tree key={c.uid} n={c} />)}
    </div>
  );

  return (
    <div className="flex gap-2">
      {/* LAYER TREE + node editor + audit list — only while this band is selected */}
      {selected && (
        <div className="w-60 shrink-0 space-y-2 self-start rounded-lg border border-slate-200 bg-white p-2">
          <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Layer tree</div>
          <div className="max-h-72 overflow-auto">{tree ? <Tree n={tree} /> : <div className="px-1 text-xs text-slate-400">—</div>}</div>

          {sel && facts && (
            <div className="space-y-1.5 border-t border-slate-100 pt-2">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selected: {facts.tag}</div>
              {facts.text != null && (
                <textarea
                  defaultValue={facts.text}
                  key={`t-${sel}`}
                  rows={2}
                  className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                  placeholder="Text"
                  onBlur={(e) => { if (e.target.value !== facts.text) setPatch({ op: "text", uid: sel, value: e.target.value }); }}
                />
              )}
              {facts.src != null && (
                <input key={`i-${sel}`} defaultValue={facts.src} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs" placeholder="Image URL"
                  onBlur={(e) => { if (e.target.value && e.target.value !== facts.src) setPatch({ op: "image", uid: sel, src: e.target.value }); }} />
              )}
              {facts.href != null && (
                <input key={`a-${sel}`} defaultValue={facts.href} className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs" placeholder="Link URL"
                  onBlur={(e) => { if (e.target.value && e.target.value !== facts.href) setPatch({ op: "link", uid: sel, href: e.target.value }); }} />
              )}
              <div className="flex items-center gap-1.5 px-1">
                <label className="text-[11px] text-slate-500">Color</label>
                <input type="color" className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                  onChange={(e) => setPatch({ op: "style", uid: sel, style: { color: e.target.value } })} />
                <label className="text-[11px] text-slate-500">Bg</label>
                <input type="color" className="h-5 w-7 cursor-pointer border-0 bg-transparent p-0"
                  onChange={(e) => setPatch({ op: "style", uid: sel, style: { "background-color": e.target.value } })} />
                <button className="ml-auto rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                  onClick={() => setPatch({ op: "hide", uid: sel })}>Hide</button>
              </div>
            </div>
          )}

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
