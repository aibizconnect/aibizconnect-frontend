import { parse, type HTMLElement } from "node-html-parser";
import { applyCapturedStyle, applyCapturedTypo, parseDataCs, gridColumnCount } from "./style-capture";

/**
 * Server-only faithful HTML → editable-blocks importer. Walks the page BODY in DOCUMENT ORDER and
 * maps each real element to one of our editable section/element types — so a "Smart rebuild" mirrors
 * the original structure (headings, paragraphs, images, buttons, lists, quotes, dividers, video,
 * galleries, forms), in the same order, and every block is editable.
 *
 * - Site chrome (script/style/header/nav/footer/aside) is dropped — the global Header/Footer blocks
 *   provide navigation site-wide (no duplicates).
 * - Unknown/complex nodes (tables, embeds) fall back to an `html` block so nothing is lost and it
 *   still renders.
 */

const DROP = new Set(["script", "style", "noscript", "svg", "head", "header", "footer", "nav", "aside", "template", "iframe-skip"]);
const CTA_WORDS = /\b(contact|get|book|call|sign\s?up|buy|start|request|quote|schedule|subscribe|learn more|get started|free|demo|apply|join|download|shop|order|try)\b/i;

function isContentImage(src: string): boolean {
  const s = src.toLowerCase();
  if (!s || s.startsWith("data:")) return false;
  if (/\.svg(\?|$)/.test(s)) return false;
  return !/(logo|icon|sprite|favicon|avatar|badge|pixel|spacer|1x1|loader)/.test(s);
}

function clean(t: string): string {
  return (t || "").replace(/\s+/g, " ").trim();
}

export function htmlToSections(html: string, baseUrl: string): Record<string, unknown>[] {
  let root: HTMLElement;
  try { root = parse(html, { comment: false, blockTextElements: { script: false, noscript: false, style: false, pre: true } }); }
  catch { return []; }

  const base = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
  const abs = (u?: string | null): string => { try { return u ? new URL(u, base).toString() : ""; } catch { return u || ""; } };

  const main = root.querySelector("main") || root.querySelector("body") || root;
  // Reassignable so collectBlocks() can harvest a fresh block list per section band.
  let out: Record<string, unknown>[] = [];

  // Buffer consecutive images so 3+ become a gallery, fewer stay as image blocks.
  let imgRun: string[] = [];
  const flushImgs = () => {
    if (imgRun.length >= 3) out.push({ type: "gallery", images: imgRun.slice(0, 12).map((url) => ({ url })) });
    else for (const url of imgRun) out.push({ type: "image", url });
    imgRun = [];
  };
  let seenText = new Set<string>();
  let skipEl: HTMLElement | null = null; // subtree the walk should skip (handled separately)
  const pushText = (text: string, italic = false, el?: HTMLElement) => {
    const t = clean(text);
    if (t.length < 2) return;
    const key = t.slice(0, 120).toLowerCase();
    if (seenText.has(key)) return;
    seenText.add(key);
    const base: Record<string, unknown> = italic ? { type: "text", text: t, italic: true } : { type: "text", text: t };
    out.push(applyCapturedTypo(base, el?.getAttribute("data-cs")));
  };

  const tagOf = (el: HTMLElement) => (el.rawTagName || "").toLowerCase();
  const looksLikeButton = (el: HTMLElement) => {
    const cls = (el.getAttribute("class") || "").toLowerCase();
    if (/\b(btn|button|cta)\b/.test(cls)) return true;
    if (el.getAttribute("role") === "button") return true;
    return CTA_WORDS.test(clean(el.text)) && clean(el.text).length <= 32;
  };

  const formToContactForm = (el: HTMLElement): Record<string, unknown> => {
    const fields: { name: string; label: string; type: string }[] = [];
    const seen = new Set<string>();
    for (const inp of el.querySelectorAll("input, textarea, select")) {
      const itype = (inp.getAttribute("type") || (tagOf(inp) === "textarea" ? "textarea" : "text")).toLowerCase();
      if (["submit", "button", "hidden", "checkbox", "radio", "image", "file"].includes(itype)) continue;
      const name = inp.getAttribute("name") || inp.getAttribute("id") || `field_${fields.length + 1}`;
      if (seen.has(name)) continue; seen.add(name);
      const label = inp.getAttribute("placeholder") || inp.getAttribute("aria-label") || name.replace(/[_-]+/g, " ");
      const ftype = itype === "email" ? "email" : itype === "tel" ? "tel" : tagOf(inp) === "textarea" ? "textarea" : "text";
      fields.push({ name, label: clean(label).slice(0, 40) || "Field", type: ftype });
      if (fields.length >= 6) break;
    }
    if (!fields.length) fields.push({ name: "name", label: "Name", type: "text" }, { name: "email", label: "Email", type: "email" });
    const heading = clean(el.querySelector("h1,h2,h3,legend")?.text || "Get in touch").slice(0, 80);
    return { type: "contact-form", heading, fields, submitLabel: "Send" };
  };

  // Detect a HERO band at the very top and emit it as one `hero` section (heading + subheading +
  // CTAs + background), then REMOVE it so the generic walk doesn't re-emit its parts. Only two SAFE
  // strategies are used (never remove a large content wrapper): an explicit hero/banner container,
  // or the first of several <section>s.
  const detectHero = (container: HTMLElement): Record<string, unknown> | null => {
    let heroEl: HTMLElement | null = null;
    // (a) class/id hints
    for (const el of container.querySelectorAll("section, header, div").slice(0, 40)) {
      const idc = ((el.getAttribute("class") || "") + " " + (el.getAttribute("id") || "")).toLowerCase();
      if (/\b(hero|banner|jumbotron|masthead|intro|cover|headline)\b/.test(idc) && el.querySelector("h1, h2")) { heroEl = el; break; }
    }
    // (b) first of several top-level <section>s that contains an h1
    if (!heroEl) {
      const sections = container.childNodes.filter((n: any) => n.nodeType === 1 && (n.rawTagName || "").toLowerCase() === "section") as HTMLElement[];
      if (sections.length >= 2 && sections[0].querySelector("h1")) heroEl = sections[0];
    }
    if (!heroEl) return null;

    const headingEl = heroEl.querySelector("h1") || heroEl.querySelector("h2");
    const heading = clean(headingEl?.text || "");
    if (!heading) return null;

    let subheading = "";
    for (const p of heroEl.querySelectorAll("p")) { const t = clean(p.text); if (t.length >= 12 && t !== heading) { subheading = t; break; } }

    const ctas: { label: string; href: string }[] = [];
    for (const a of heroEl.querySelectorAll("a, button")) {
      if (!looksLikeButton(a)) continue;
      const label = clean(a.text); if (!label || label.length > 40) continue;
      ctas.push({ label, href: abs(a.getAttribute("href") || "#") });
      if (ctas.length >= 2) break;
    }

    let bg = "";
    for (const img of heroEl.querySelectorAll("img")) { const src = img.getAttribute("src") || img.getAttribute("data-src"); if (src && isContentImage(src)) { bg = abs(src); break; } }
    if (!bg) {
      const styled = [heroEl, ...heroEl.querySelectorAll("[style]")].find((e: any) => /background(-image)?\s*:[^;]*url\(/i.test(e.getAttribute?.("style") || ""));
      if (styled) { const m = /url\((['"]?)([^'")]+)\1\)/i.exec(styled.getAttribute("style") || ""); if (m) bg = abs(m[2]); }
    }

    const hero: Record<string, unknown> = { type: "hero", heading, _name: "Hero" };
    if (subheading) hero.subheading = subheading;
    if (ctas[0]) hero.primaryCta = ctas[0];
    if (ctas[1]) hero.secondaryCta = ctas[1];
    if (bg) hero.backgroundImageUrl = bg;
    applyCapturedStyle(hero, heroEl.getAttribute("data-cs"));
    try { heroEl.remove(); } catch { /* ignore */ }
    return hero;
  };

  const walk = (node: HTMLElement) => {
    for (const raw of node.childNodes) {
      const el = raw as HTMLElement;
      if (!el || el.nodeType !== 1) continue; // element nodes only
      if (skipEl && el === skipEl) continue;  // skip a subtree (e.g. a card grid handled separately)
      const tag = tagOf(el);
      if (!tag || DROP.has(tag)) continue;

      if (/^h[1-6]$/.test(tag)) { flushImgs(); const text = clean(el.text); if (text) out.push(applyCapturedTypo({ type: "heading", text, level: tag }, el.getAttribute("data-cs"))); continue; }
      if (tag === "img") { const src = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-lazy-src"); if (src && isContentImage(src)) imgRun.push(abs(src)); continue; }
      if (tag === "picture") { const s = el.querySelector("img"); const src = s?.getAttribute("src") || s?.getAttribute("data-src"); if (src && isContentImage(src)) imgRun.push(abs(src)); continue; }
      if (tag === "ul" || tag === "ol") { flushImgs(); const items = el.querySelectorAll("li").map((li) => ({ text: clean(li.text) })).filter((i) => i.text); if (items.length) out.push({ type: "bullet-list", items: items.slice(0, 12), bulletStyle: tag === "ol" ? "number" : "check" }); continue; }
      if (tag === "hr") { flushImgs(); out.push({ type: "divider" }); continue; }
      if (tag === "blockquote") { flushImgs(); pushText(el.text, true, el); continue; }
      if (tag === "video") { flushImgs(); const src = el.getAttribute("src") || el.querySelector("source")?.getAttribute("src"); if (src) out.push({ type: "video", url: abs(src) }); continue; }
      if (tag === "iframe") { const src = el.getAttribute("src") || ""; if (/youtube|youtu\.be|vimeo|wistia/i.test(src)) { flushImgs(); out.push({ type: "video", url: src }); } continue; }
      if (tag === "form") { flushImgs(); out.push(formToContactForm(el)); continue; }
      if (tag === "button" || tag === "a") {
        if (looksLikeButton(el)) { flushImgs(); const label = clean(el.text); const href = abs(el.getAttribute("href") || "#"); if (label) out.push(applyCapturedTypo({ type: "button", label: label.slice(0, 40), href }, el.getAttribute("data-cs"))); continue; }
        walk(el); continue; // ordinary link → recurse for nested text/images
      }
      if (tag === "p") {
        // A paragraph that is ONLY an image/link is handled by recursion; otherwise its text.
        const directText = clean(el.childNodes.filter((n) => n.nodeType === 3).map((n) => (n as any).text || "").join(" "));
        if (directText.length >= 2) { flushImgs(); pushText(el.text, false, el); }
        else walk(el);
        continue;
      }
      if (tag === "table") { flushImgs(); out.push({ type: "html", code: el.toString().slice(0, 20000) }); continue; }
      // Generic container: capture its OWN direct text (many designs use styled <div>/<span> as
      // titles/paragraphs instead of <h*>/<p>), then recurse into child elements to preserve order.
      const dtxt = clean(el.childNodes.filter((n) => n.nodeType === 3).map((n) => (n as any).text || "").join(" "));
      if (dtxt.length >= 2) {
        flushImgs();
        const cs = el.getAttribute("data-cs") || "";
        const fw = /fontWeight:(\d+)/.exec(cs); const fsM = /fontSize:(\d+)/.exec(cs);
        const headingLike = ((fw && +fw[1] >= 600) || (fsM && +fsM[1] >= 18)) && dtxt.length <= 60;
        if (headingLike) out.push(applyCapturedTypo({ type: "heading", text: dtxt, level: "h3" }, cs));
        else pushText(dtxt, false, el);
      }
      walk(el);
    }
  };

  // Harvest a FRESH ordered block list from a subtree (resets the shared walk state).
  const collectBlocks = (node: HTMLElement, skip?: HTMLElement | null): Record<string, unknown>[] => {
    out = []; imgRun = []; seenText = new Set<string>(); skipEl = skip ?? null;
    walk(node); flushImgs(); skipEl = null;
    return out;
  };
  const elementChildren = (node: HTMLElement): HTMLElement[] =>
    (node.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
  const bandName = (blocks: Record<string, unknown>[]): string => {
    const h = blocks.find((b) => b.type === "heading");
    return h ? clean(String(h.text || "")).slice(0, 40) || "Section" : "Section";
  };

  // 1) Hero band first (detected + removed so it isn't re-emitted below).
  const result: Record<string, unknown>[] = [];
  const hero = detectHero(main);
  if (hero) result.push(hero);

  // 2) Find the container whose direct children are the page's section bands (descend through a
  //    single wrapper div until we hit <section>s or multiple children).
  let container = main;
  for (let i = 0; i < 3; i++) {
    const kids = elementChildren(container);
    if (kids.some((k) => tagOf(k) === "section")) break;
    if (kids.length === 1 && tagOf(kids[0]) !== "section" && !DROP.has(tagOf(kids[0]))) container = kids[0];
    else break;
  }

  // 3) Wrap each top-level band into a 1-column row carrying that band's captured _style
  //    (bg + padding). Leaf blocks stay inside as editable children. No deep recursion (v1).
  // Find the dominant CARD GRID inside a band (a flex/grid container with 2–12 similar card children)
  // so feature/industry grids become a real multi-column row instead of stacked blocks.
  const findCardGrid = (band: HTMLElement): { el: HTMLElement; cards: HTMLElement[]; cols: number } | null => {
    let best: { el: HTMLElement; cards: HTMLElement[]; cols: number } | null = null;
    let bestScore = 0;
    for (const el of band.querySelectorAll("div, ul, section")) {
      const kids = elementChildren(el).filter((k) => !DROP.has(tagOf(k)));
      if (kids.length < 2 || kids.length > 12) continue;
      const cardish = kids.filter((k) => (k.querySelector && k.querySelector("h1,h2,h3,h4,h5,h6")) || clean(k.text).length > 8);
      if (cardish.length < 2 || cardish.length < Math.ceil(kids.length * 0.6)) continue;
      const cs = el.getAttribute("data-cs") || "";
      const gc = gridColumnCount(cs);
      const isFlexGrid = /display:(flex|grid)/.test(cs) || gc >= 2;
      const score = kids.length * (isFlexGrid ? 3 : 1);
      if (score > bestScore) { best = { el, cards: cardish, cols: gc || cardish.length }; bestScore = score; }
    }
    return best;
  };

  for (const band of elementChildren(container)) {
    if (DROP.has(tagOf(band))) continue;
    const bandStyle = parseDataCs(band.getAttribute("data-cs")).style;
    let children: Record<string, unknown>[][] = [];

    const grid = findCardGrid(band);
    let built = false;
    if (grid && grid.cards.length >= 2) {
      const cols: Record<string, unknown>[][] = [];
      const colStyles: Record<string, unknown>[] = [];
      for (const card of grid.cards) {
        const b = collectBlocks(card);
        if (b.length) { cols.push(b); colStyles.push(parseDataCs(card.getAttribute("data-cs")).style); }
      }
      if (cols.length >= 2) {
        const intro = collectBlocks(band, grid.el); // band content WITHOUT the grid subtree
        const gridStyle = parseDataCs(grid.el.getAttribute("data-cs")).style;
        const nested: Record<string, unknown> = {
          type: "row", columns: Math.min(cols.length, 12), contentWidth: "boxed", gap: 16,
          _name: "Cards", children: cols, colStyles,
        };
        if (Object.keys(gridStyle).length) nested._style = gridStyle;
        children = [[...intro, nested]];
        built = true;
      }
    }
    if (!built) children = [collectBlocks(band)]; // non-destructive fallback — full band content

    if (!children[0].length) continue;
    const row: Record<string, unknown> = { type: "row", columns: 1, contentWidth: "boxed", _name: bandName(children[0]), children };
    if (Object.keys(bandStyle).length) row._style = bandStyle;
    result.push(row);
    if (result.length >= 60) break;
  }

  // 4) Fallback: if no bands were wrapped (unusual markup), emit the flat block list.
  if (!result.some((r) => r.type === "row")) result.push(...collectBlocks(main));

  return result.slice(0, 60);
}
