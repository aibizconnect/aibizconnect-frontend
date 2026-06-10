import { parse, type HTMLElement } from "node-html-parser";

/**
 * LOSSLESS import (architect D-178..D-183): the imported page's REAL HTML is the source of truth.
 *
 * Instead of translating the DOM into native block types (the heuristic path in html-importer.ts,
 * now the opt-in "Convert to editable blocks"), the page is split at its top-level band boundaries
 * (<header>/<nav>/<section>/<footer>) and each band's subtree is stored VERBATIM as a
 * `{ type: "imported-html", html }` section — fidelity by construction, DOM order preserved
 * trivially. The compiled-CSS snapshot the render bridge captured (<style id="__snapshot_css">,
 * D-180) plus the @font-face/:root harvest ride along as ONE `{ type: "imported-css", css }`
 * carrier section, so the page renders identically forever with no Tailwind-CDN dependency.
 *
 * Node-level edits are PATCHES keyed by the stable data-uid the bridge stamped (D-179) — applied
 * at render over the immutable original (applyPatches), so editing can never corrupt the design.
 *
 * Security (Copilot condition): imported markup is sanitized — <script>/<iframe…> dropped,
 * on* handlers and javascript: URLs stripped. Semantic attributes (role/aria-*) are preserved.
 */

export type ImportedPatch =
  | { op: "text"; uid: string; value: string }
  | { op: "image"; uid: string; src: string; alt?: string }
  | { op: "link"; uid: string; href: string }
  | { op: "style"; uid: string; style: Record<string, string> }
  | { op: "hide"; uid: string }
  | { op: "attr"; uid: string; name: string; value: string | null }
  // Structural ops (Copilot extended set): every Layer Tree node is movable, duplicatable and
  // removable. Patches apply IN ORDER, so repeated moves accumulate (and stay auditable).
  | { op: "remove"; uid: string }
  | { op: "move"; uid: string; dir: "up" | "down" }
  | { op: "duplicate"; uid: string; cloneId: string };

const BAND_TAGS = new Set(["section", "header", "footer", "nav", "main", "article"]);
const STRIP_TAGS = new Set(["script", "noscript", "object", "embed", "base"]);

function sanitize(el: HTMLElement): void {
  for (const bad of el.querySelectorAll(Array.from(STRIP_TAGS).join(","))) bad.remove();
  const all = [el, ...el.querySelectorAll("*")];
  for (const node of all) {
    const attrs = node.attributes || {};
    for (const name of Object.keys(attrs)) {
      if (/^on/i.test(name)) node.removeAttribute(name);
      else if ((name === "href" || name === "src" || name === "xlink:href") && /^\s*javascript:/i.test(attrs[name] || "")) node.removeAttribute(name);
    }
  }
}

function absolutify(el: HTMLElement, baseUrl: string): void {
  if (!baseUrl) return;
  const abs = (v: string): string => { try { return new URL(v, baseUrl).toString(); } catch { return v; } };
  for (const node of el.querySelectorAll("[src], [href], source[srcset], img[srcset]")) {
    for (const a of ["src", "href"]) {
      const v = node.getAttribute(a);
      if (v && !/^(#|mailto:|tel:|data:|https?:)/i.test(v)) node.setAttribute(a, abs(v));
    }
    const ss = node.getAttribute("srcset");
    if (ss) node.setAttribute("srcset", ss.split(",").map((part) => {
      const [u, d] = part.trim().split(/\s+/);
      return /^(data:|https?:)/i.test(u) ? part.trim() : [abs(u), d].filter(Boolean).join(" ");
    }).join(", "));
  }
}

/** First heading text (or tag/id) → a human band name for the editor's section list. */
function bandName(el: HTMLElement, index: number): string {
  const tag = (el.rawTagName || "").toLowerCase();
  if (tag === "nav" || tag === "header") return "Header";
  if (tag === "footer") return "Footer";
  const id = el.getAttribute("id");
  const h = el.querySelector("h1,h2,h3,h4");
  const t = (h?.text || "").replace(/\s+/g, " ").trim().slice(0, 40);
  return t || (id ? id.charAt(0).toUpperCase() + id.slice(1) : `Section ${index + 1}`);
}

export type LosslessImport = {
  sections: Record<string, unknown>[];
  seo: { title?: string; description?: string; imageUrl?: string };
  css: string;
  fontHrefs: string[];
};

export function htmlToLosslessSections(html: string, baseUrl = ""): LosslessImport {
  const root = parse(html, { comment: false });

  // CSS: full compiled snapshot (D-180) + the font-face/:root harvest (older bridges may only have
  // the harvest). Snapshot already CONTAINS the harvest rules when both exist — prefer snapshot.
  const snapshot = root.querySelector("style#__snapshot_css")?.text || "";
  const harvest = root.querySelector("style#__imported_css")?.text || "";
  const css = (snapshot || harvest).trim();

  // Fonts: keep stylesheet links to font CDNs for preloading (the snapshot carries the @font-face
  // rules; the links make sure the font FILES start downloading early).
  const fontHrefs: string[] = [];
  for (const l of root.querySelectorAll('link[rel="stylesheet"], link[rel="preload"]')) {
    const href = l.getAttribute("href") || "";
    if (/fonts\.googleapis|fonts\.gstatic|typekit|fontshare/i.test(href)) fontHrefs.push(href);
  }

  // SEO out of the head, into our page fields.
  const seo: LosslessImport["seo"] = {};
  const title = root.querySelector("title")?.text?.trim();
  if (title) seo.title = title.slice(0, 120);
  const desc = root.querySelector('meta[name="description"]')?.getAttribute("content")
    || root.querySelector('meta[property="og:description"]')?.getAttribute("content");
  if (desc) seo.description = desc.slice(0, 300);
  const ogImg = root.querySelector('meta[property="og:image"]')?.getAttribute("content");
  if (ogImg) seo.imageUrl = ogImg;

  // Bands: descend through transparent single-child wrappers until the level whose children are
  // the page's top-to-bottom bands, then take EVERY element child in DOM order — nothing dropped,
  // nothing reordered. Non-band leaves (a loose div between sections) are kept as bands too.
  const body = root.querySelector("body") ?? root;
  let container: HTMLElement = body as HTMLElement;
  for (let i = 0; i < 4; i++) {
    const kids = (container.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
    if (kids.some((k) => BAND_TAGS.has((k.rawTagName || "").toLowerCase()))) break;
    if (kids.length === 1) container = kids[0];
    else break;
  }

  const sections: Record<string, unknown>[] = [];
  if (css) sections.push({ type: "imported-css", css, fontHrefs, _name: "Imported design CSS" });

  const kids = (container.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
  let i = 0;
  for (const band of kids) {
    const tag = (band.rawTagName || "").toLowerCase();
    if (STRIP_TAGS.has(tag) || tag === "style" || tag === "link") continue;
    sanitize(band);
    absolutify(band, baseUrl);
    const bandHtml = band.toString();
    if (bandHtml.replace(/<[^>]+>/g, "").trim().length === 0 && !band.querySelector("img,picture,svg,video,iframe")) continue;
    sections.push({ type: "imported-html", html: bandHtml, patches: [], _name: bandName(band, i) });
    i++;
  }
  return { sections, seo, css, fontHrefs };
}

/** Apply node patches over the immutable imported HTML (render-time; original never mutated). */
export function applyPatches(html: string, patches: ImportedPatch[] | undefined): string {
  if (!patches || !patches.length) return html;
  const root = parse(html, { comment: false });
  for (const p of patches) {
    const node = root.querySelector(`[data-uid="${p.uid}"]`);
    if (!node) continue;
    switch (p.op) {
      case "text": node.set_content(escapeHtml(p.value)); break;
      case "image": node.setAttribute("src", p.src); if (p.alt != null) node.setAttribute("alt", p.alt); node.removeAttribute("srcset"); break;
      case "link": node.setAttribute("href", p.href); break;
      case "style": {
        const prev = node.getAttribute("style") || "";
        const add = Object.entries(p.style).map(([k, v]) => `${k}:${v}`).join(";");
        node.setAttribute("style", prev ? `${prev};${add}` : add);
        break;
      }
      case "hide": node.setAttribute("style", `${node.getAttribute("style") || ""};display:none`); break;
      case "attr": p.value == null ? node.removeAttribute(p.name) : node.setAttribute(p.name, p.value); break;
      case "remove": node.remove(); break;
      case "move": {
        const parent: any = node.parentNode;
        if (!parent) break;
        const sibs = (parent.childNodes || []).filter((n: any) => n.nodeType === 1);
        const idx = sibs.indexOf(node);
        const target = p.dir === "up" ? sibs[idx - 1] : sibs[idx + 1];
        if (!target) break;
        const html = node.toString();
        target.insertAdjacentHTML(p.dir === "up" ? "beforebegin" : "afterend", html);
        node.remove();
        break;
      }
      case "duplicate": {
        // Clone with FRESH uids (orig uid + .cloneId) so the copy's nodes are addressable and
        // editable independently of the original.
        const cloned = node.toString().replace(/data-uid="([^"]+)"/g, (_m, u) => `data-uid="${u}.${p.cloneId}"`);
        node.insertAdjacentHTML("afterend", cloned);
        break;
      }
    }
  }
  return root.toString();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
