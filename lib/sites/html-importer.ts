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

export function htmlToSections(html: string, baseUrl: string, opts?: { faithful?: boolean }): Record<string, unknown>[] {
  // `faithful` (design-import mode): do NOT collapse the first section into our opinionated
  // composite `hero` block (which imposes our 2-column-with-image layout + only keeps one
  // paragraph). Keep every band as a row of editable PRIMITIVES in the design's real order, so
  // the imported page matches the source instead of our hero template.
  const faithful = !!opts?.faithful;
  let root: HTMLElement;
  try { root = parse(html, { comment: false, blockTextElements: { script: false, noscript: false, style: false, pre: true } }); }
  catch { return []; }

  const base = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
  const abs = (u?: string | null): string => { try { return u ? new URL(u, base).toString() : ""; } catch { return u || ""; } };

  const main = root.querySelector("main") || root.querySelector("body") || root;
  // Reassignable so collectBlocks() can harvest a fresh block list per section band.
  let out: Record<string, unknown>[] = [];

  // Buffer consecutive images so 3+ become a gallery, fewer stay as image blocks. Each entry may
  // carry a captured pixel width + corner radius so small avatars/logos stay small & round instead
  // of blowing up to full width.
  type ImgEntry = { url: string; width?: number; rounding?: number };
  let imgRun: ImgEntry[] = [];
  const flushImgs = () => {
    if (imgRun.length >= 3) out.push({ type: "gallery", images: imgRun.slice(0, 12).map((e) => ({ url: e.url })) });
    else for (const e of imgRun) out.push({ type: "image", url: e.url, ...(e.width ? { width: e.width } : {}), ...(e.rounding ? { rounding: e.rounding } : {}) });
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
  // Build a button block, capturing its real fill/border so a gold primary stays gold and a
  // ghost/outline stays outlined (instead of every CTA defaulting to one solid color).
  const buildButton = (el: HTMLElement): Record<string, unknown> => {
    const label = clean(el.text).slice(0, 40);
    const href = abs(el.getAttribute("href") || "#");
    const { style, typo } = parseDataCs(el.getAttribute("data-cs"));
    const b: Record<string, unknown> = { type: "button", label, href };
    if (style.bg) { b.bgColor = style.bg as string; b.variant = "solid"; } else b.variant = "outline";
    if (typo.color) b.textColor = typo.color as string;
    if (typeof style.radius === "number") b.radius = style.radius;
    return b;
  };

  const formToContactForm = (el: HTMLElement): Record<string, unknown> => {
    // Map each input to OUR CRM field name (name/email/phone/message) so submissions create a Contact
    // (the /api/leads/submit handler keys on exactly these). Use the real <label> text for the label.
    const labelFor = (inp: HTMLElement): string => {
      const id = inp.getAttribute("id");
      if (id) { const lab = el.querySelector(`label[for="${id}"]`); if (lab && clean(lab.text)) return clean(lab.text); }
      // label wrapping the input
      let p: any = inp.parentNode;
      for (let i = 0; i < 3 && p; i++) { if ((p.rawTagName || "").toLowerCase() === "label" && clean(p.text)) return clean(p.text); p = p.parentNode; }
      return clean(inp.getAttribute("aria-label") || inp.getAttribute("placeholder") || "");
    };
    const crmName = (itype: string, hint: string): string => {
      const h = hint.toLowerCase();
      if (itype === "email" || /e-?mail/.test(h)) return "email";
      if (itype === "tel" || /phone|mobile|tel/.test(h)) return "phone";
      if (itype === "textarea" || /message|comment|help|note|inquir/.test(h)) return "message";
      if (/name/.test(h)) return "name";
      return "";
    };
    const fields: { name: string; label: string; type: string }[] = [];
    const usedCrm = new Set<string>();
    for (const inp of el.querySelectorAll("input, textarea, select")) {
      const itype = (inp.getAttribute("type") || (tagOf(inp) === "textarea" ? "textarea" : "text")).toLowerCase();
      if (["submit", "button", "hidden", "checkbox", "radio", "image", "file"].includes(itype)) continue;
      const ftype = itype === "email" ? "email" : itype === "tel" ? "tel" : tagOf(inp) === "textarea" ? "textarea" : "text";
      const rawHint = (inp.getAttribute("name") || "") + " " + (inp.getAttribute("id") || "") + " " + labelFor(inp);
      let name = crmName(ftype, rawHint);
      if (!name || usedCrm.has(name)) name = name && !usedCrm.has(name) ? name : (inp.getAttribute("name") || `field_${fields.length + 1}`);
      usedCrm.add(name);
      const label = clean(labelFor(inp)).slice(0, 40) || (name.charAt(0).toUpperCase() + name.slice(1));
      fields.push({ name, label, type: ftype });
      if (fields.length >= 6) break;
    }
    if (!fields.length) fields.push({ name: "name", label: "Name", type: "text" }, { name: "email", label: "Email", type: "email" });
    // Real submit button text (e.g. "Send Message") + its captured fill/text color.
    const submitEl = el.querySelector('button[type="submit"], input[type="submit"], button');
    const submitLabel = clean(submitEl?.getAttribute("value") || submitEl?.text || "Send").slice(0, 40) || "Send";
    const out: Record<string, unknown> = { type: "contact-form", heading: clean(el.querySelector("h1,h2,h3,legend")?.text || "Get in touch").slice(0, 80), fields, submitLabel };
    if (submitEl) {
      const { style, typo } = parseDataCs(submitEl.getAttribute("data-cs"));
      if (style.bg) out.submitColor = style.bg as string;
      if (typo.color) out.submitTextColor = typo.color as string;
    }
    return out;
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

  // Icon fonts (Material Symbols/Icons, used heavily by Stitch) render a GLYPH in the browser but
  // their TEXT is the ligature name ("star","bolt"). Reading that text verbatim prints the word and
  // stacks each icon on its own line. Detect icon elements and map known names to a glyph; unknown
  // icons are dropped (cleaner than printing "bolt"). A row of icons (e.g. a 5-star rating) collapses
  // into ONE inline text so it stays horizontal.
  // Monochrome symbols only — NO colorful emoji (would clash with the source's styled line-icons).
  // Used for star-rating rows mainly; other icons are dropped rather than emojified.
  const ICON_GLYPH: Record<string, string> = {
    star: "★", grade: "★", star_rate: "★", star_half: "★",
  };
  const isIconEl = (el: HTMLElement): boolean => {
    const cls = (el.getAttribute("class") || "").toLowerCase();
    if (!/\bmaterial-symbols|material-icons\b/.test(cls)) return false;
    const t = clean(el.text);
    return !!t && t.length <= 24 && /^[a-z0-9_ ]+$/.test(t); // ligature name, not real copy
  };
  const glyphFor = (el: HTMLElement): string => ICON_GLYPH[clean(el.text).toLowerCase()] || "";
  // Text of an element with INLINE icon-font ligatures REMOVED (e.g. a heading
  // "<span class=material-symbols>location_on</span> Ottawa Office" → "Ottawa Office"). We do NOT
  // substitute emoji — the source uses styled line-icons, and colorful emoji would clash. Standalone
  // rating rows still become ★ via the separate icon path.
  const cleanText = (el: HTMLElement): string => {
    let t = clean(el.text);
    const icons = el.querySelectorAll('[class*="material-symbols"], [class*="material-icons"]');
    for (const ic of icons) { const w = clean(ic.text); if (w && w.length <= 24 && /^[a-z0-9_ ]+$/.test(w)) t = t.replace(w, " "); }
    return clean(t);
  };
  // Captured pixel width / corner radius for an <img> from its data-cs (used to keep avatars small).
  const imgSizeFrom = (el: HTMLElement): { width?: number; rounding?: number } => {
    const cs = el.getAttribute("data-cs") || "";
    const w = /(?:^|\|)width:(\d+)px/.exec(cs);
    const r = /borderTopLeftRadius:(\d+)px/.exec(cs);
    const out: { width?: number; rounding?: number } = {};
    // Only pin width for SMALL images (avatars/logos/icons) so large content images still fill.
    if (w && +w[1] > 0 && +w[1] <= 260) out.width = +w[1];
    if (r) out.rounding = Math.min(+r[1], 9999);
    return out;
  };

  const walk = (node: HTMLElement) => {
    for (const raw of node.childNodes) {
      const el = raw as HTMLElement;
      if (!el || el.nodeType !== 1) continue; // element nodes only
      if (skipEl && el === skipEl) continue;  // skip a subtree (e.g. a card grid handled separately)
      const tag = tagOf(el);
      if (!tag || DROP.has(tag)) continue;

      // Icon-font handling (before generic text). A single icon → its glyph; an all-icon container
      // (rating row) → one combined inline glyph string (kept horizontal, NOT one block per star).
      if (isIconEl(el)) { const g = glyphFor(el); if (g) { flushImgs(); out.push(applyCapturedTypo({ type: "text", text: g }, el.getAttribute("data-cs"))); } continue; }
      {
        const kids = (el.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
        if (kids.length >= 2 && kids.every(isIconEl)) {
          const g = kids.map(glyphFor).join("");
          if (g) { flushImgs(); out.push(applyCapturedTypo({ type: "text", text: g }, el.getAttribute("data-cs"))); }
          continue;
        }
      }

      // Button GROUP: a horizontal container holding 2+ CTA buttons (e.g. "Get Pre-Approved" +
      // "Book a Call") → a multi-column row so they sit SIDE-BY-SIDE instead of stacking.
      {
        const cs = el.getAttribute("data-cs") || "";
        if ((tag === "div" || tag === "span") && !/flexDirection:column/.test(cs)) {
          const kids = (el.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
          const btns = kids.filter((k) => (tagOf(k) === "a" || tagOf(k) === "button") && looksLikeButton(k));
          if (btns.length >= 2 && btns.length === kids.length) {
            flushImgs();
            out.push({ type: "row", columns: Math.min(btns.length, 4), contentWidth: "boxed", gap: 12, _name: "Buttons", children: btns.map((b) => [buildButton(b)]) });
            continue;
          }
        }
      }

      // Link LIST (footer "Quick Links"/"Compliance", nav menus): a ul/div whose children are all
      // plain (non-button) links → a vertical menu, preserving every link.
      if (tag === "ul" || tag === "div" || tag === "nav") {
        const lis = (el.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
        // A link counts only if it has REAL link text (after stripping inline icons). This excludes
        // icon-only social links whose text is a bare ligature ("face_nod","share") that would
        // otherwise pollute a footer menu.
        const linkEls = lis.map((k) => (tagOf(k) === "a" ? k : k.querySelector("a")))
          .filter((a): a is HTMLElement => !!a && !looksLikeButton(a) && !!cleanText(a) && !/^[a-z][a-z0-9_]*$/.test(clean(a.text)));
        if (lis.length >= 2 && linkEls.length >= 2 && linkEls.length >= Math.ceil(lis.length * 0.7)) {
          flushImgs();
          const items = linkEls.slice(0, 12).map((a) => ({ label: cleanText(a).slice(0, 40), href: abs(a.getAttribute("href") || "#") }));
          out.push({ type: "menu", items, orientation: "vertical" });
          continue;
        }
      }

      if (/^h[1-6]$/.test(tag)) { flushImgs(); const text = cleanText(el); if (text) out.push(applyCapturedTypo({ type: "heading", text, level: tag }, el.getAttribute("data-cs"))); continue; }
      if (tag === "img") { const src = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-lazy-src"); if (src && isContentImage(src)) imgRun.push({ url: abs(src), ...imgSizeFrom(el) }); continue; }
      if (tag === "picture") { const s = el.querySelector("img"); const src = s?.getAttribute("src") || s?.getAttribute("data-src"); if (src && isContentImage(src)) imgRun.push({ url: abs(src), ...(s ? imgSizeFrom(s) : {}) }); continue; }
      if (tag === "ul" || tag === "ol") { flushImgs(); const items = el.querySelectorAll("li").map((li) => ({ text: clean(li.text) })).filter((i) => i.text); if (items.length) out.push({ type: "bullet-list", items: items.slice(0, 12), bulletStyle: tag === "ol" ? "number" : "check" }); continue; }
      if (tag === "hr") { flushImgs(); out.push({ type: "divider" }); continue; }
      if (tag === "blockquote") { flushImgs(); pushText(el.text, true, el); continue; }
      if (tag === "video") { flushImgs(); const src = el.getAttribute("src") || el.querySelector("source")?.getAttribute("src"); if (src) out.push({ type: "video", url: abs(src) }); continue; }
      if (tag === "iframe") { const src = el.getAttribute("src") || ""; if (/youtube|youtu\.be|vimeo|wistia/i.test(src)) { flushImgs(); out.push({ type: "video", url: src }); } continue; }
      if (tag === "form") { flushImgs(); out.push(formToContactForm(el)); continue; }
      if (tag === "button" || tag === "a") {
        if (looksLikeButton(el)) { flushImgs(); if (clean(el.text)) out.push(buildButton(el)); continue; }
        // Ordinary link: if it has an inner image, recurse; otherwise capture its TEXT (a plain text
        // node child is skipped by walk, which is why footer/menu links were vanishing).
        if (el.querySelector("img, picture")) { walk(el); continue; }
        const lt = cleanText(el);
        if (lt) { flushImgs(); out.push(applyCapturedTypo({ type: "text", text: lt }, el.getAttribute("data-cs"))); }
        continue;
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
  const hero = faithful ? null : detectHero(main);
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
    // Include the BAND ITSELF as a candidate: many designs (incl. Stitch/Tailwind output) put the
    // cards as DIRECT children of the <section> with no inner wrapper — querySelectorAll skips the
    // band, so those grids were missed and collapsed to a single column.
    for (const el of [band, ...band.querySelectorAll("div, ul, section")]) {
      const kids = elementChildren(el).filter((k) => !DROP.has(tagOf(k)));
      if (kids.length < 2 || kids.length > 12) continue;
      // A column counts if it has a heading, real text, OR an image — the last case matters for
      // split hero/feature layouts (text column + image column) where one side is image-only and
      // would otherwise be ignored, collapsing a 2-column row into a single stack.
      const cardish = kids.filter((k) => (k.querySelector && (k.querySelector("h1,h2,h3,h4,h5,h6") || k.querySelector("img,picture,svg"))) || clean(k.text).length > 8);
      if (cardish.length < 2 || cardish.length < Math.ceil(kids.length * 0.6)) continue;
      const cs = el.getAttribute("data-cs") || "";
      // A VERTICAL flex column is a stack of bands, NOT a multi-column card grid — disqualify it
      // entirely so a whole page's sections aren't squashed into columns (D-149).
      if (/flexDirection:column/.test(cs)) continue;
      const gc = gridColumnCount(cs);
      const isFlexGrid = /display:(flex|grid)/.test(cs) || gc >= 2;
      const score = kids.length * (isFlexGrid ? 3 : 1);
      if (score > bestScore) { best = { el, cards: cardish, cols: gc || cardish.length }; bestScore = score; }
    }
    return best;
  };

  // D-149 (architect D-164/165): split a page into natural VISUAL BANDS. When a top-level child is
  // just a transparent layout wrapper holding several real sections, descend into it and treat ITS
  // children as separate editable bands — instead of emitting one giant coarse row. A child is a
  // band boundary when it is semantic (<section>/<header>/<footer>/<article>), has its OWN background
  // (color or image) different from the page, or is separated by a large vertical gap (>=48px). We
  // only descend conservative, transparent, non-grid wrappers so simple pages don't over-fragment.
  const pageBg = (parseDataCs(main.getAttribute("data-cs")).style.bg as string) || "";
  const styleOf = (el: HTMLElement) => parseDataCs(el.getAttribute("data-cs")).style as Record<string, number | string>;
  const SEMANTIC_BAND = new Set(["section", "header", "footer", "article"]);
  const isBandBoundary = (el: HTMLElement): boolean => {
    if (SEMANTIC_BAND.has(tagOf(el))) return true;
    const s = styleOf(el);
    if (s.bg && s.bg !== pageBg) return true;
    if (s.bgImage) return true;
    if ((Number(s.pt) || 0) >= 48 || (Number(s.pb) || 0) >= 48 || (Number(s.mt) || 0) >= 48 || (Number(s.mb) || 0) >= 48) return true;
    return false;
  };
  // A top-level <header>/<footer> is USUALLY site chrome (global Header/Footer owns nav) — but in a
  // designed import (faithful) it's often the HERO/closing band. Keep it as a content band when it
  // has a heading or real text and isn't just a row of nav links. nav/aside stay chrome always.
  const navLike = (el: HTMLElement): boolean => {
    const links = el.querySelectorAll("a").length;
    const hasHeading = !!el.querySelector("h1, h2, h3");
    return !hasHeading && links >= 3 && clean(el.text).length < 200;
  };
  const droppableBand = (el: HTMLElement): boolean => {
    const t = tagOf(el);
    if (t === "nav" || t === "aside") return true;
    if (t === "header" || t === "footer") return faithful ? navLike(el) : true;
    return DROP.has(t);
  };
  const MAX_BAND_DEPTH = 4;
  const expandBands = (els: HTMLElement[], depth: number): HTMLElement[] => {
    const out: HTMLElement[] = [];
    for (const el of els) {
      // Keep a top <nav>/<header> in faithful mode so the band loop can rebuild it as a header.
      const keepAsHeader = faithful && (tagOf(el) === "nav" || tagOf(el) === "header");
      if (droppableBand(el) && !keepAsHeader) continue;
      if (keepAsHeader) { out.push(el); continue; }
      const kids = elementChildren(el).filter((k) => !DROP.has(tagOf(k)));
      const grid = findCardGrid(el);
      const isGridItself = !!grid && grid.el === el; // its children are cards → keep as one band (grid logic owns it)
      const s = styleOf(el);
      const hasOwnBg = !!(s.bg && s.bg !== pageBg) || !!s.bgImage; // a colored band → keep whole, don't split away its bg
      const bandLikeKids = kids.filter(isBandBoundary).length;
      // A vertical flex-column wrapper is a stack of sections → always worth splitting into bands.
      const isColumnStack = /flexDirection:column/.test(el.getAttribute("data-cs") || "");
      const splittable = depth < MAX_BAND_DEPTH && (tagOf(el) === "div" || tagOf(el) === "main")
        && kids.length >= 2 && !isGridItself && !hasOwnBg && (bandLikeKids >= 2 || (isColumnStack && kids.length >= 2));
      if (splittable) out.push(...expandBands(kids, depth + 1));
      else out.push(el);
    }
    return out;
  };
  // Build a HEADER row from a <nav>/<header> bar: brand (logo) + a menu of the nav links + any CTA
  // button, side by side. Lets a designed top bar import as an editable header (the renderer treats a
  // row containing a `menu` element as a header) instead of being dropped as chrome.
  const buildHeaderRow = (el: HTMLElement): Record<string, unknown> | null => {
    const navItems: { label: string; href: string }[] = [];
    let logo = ""; let cta: Record<string, unknown> | null = null;
    for (const a of el.querySelectorAll("a, button")) {
      const label = cleanText(a);                          // strip inline icon ligatures
      if (!label || label.length > 40) continue;
      if (/^[a-z][a-z0-9_]*$/.test(clean(a.text))) continue; // skip icon-only links ("menu","share")
      if (looksLikeButton(a)) { if (!cta) cta = buildButton(a); continue; }
      if (!logo) { logo = label; continue; }            // first plain link = brand/logo
      if (!navItems.some((n) => n.label === label)) navItems.push({ label, href: abs(a.getAttribute("href") || "#") });
    }
    if (!navItems.length && !cta) return null;
    const cols: Record<string, unknown>[][] = [];
    cols.push([{ type: "heading", text: logo || "Brand", level: "h3" }]);
    if (navItems.length) cols.push([{ type: "menu", items: navItems.slice(0, 8), orientation: "horizontal" }]);
    if (cta) cols.push([cta]);
    const row: Record<string, unknown> = { type: "row", columns: cols.length, contentWidth: "boxed", _name: "Header", children: cols };
    const st = parseDataCs(el.getAttribute("data-cs")).style;
    if (Object.keys(st).length) row._style = st;
    return row;
  };

  const bandEls = expandBands(elementChildren(container), 0);

  for (const band of bandEls) {
    // Faithful: import a top <nav>/<header> bar as an editable HEADER row (logo + menu + CTA).
    if (faithful && (tagOf(band) === "nav" || (tagOf(band) === "header" && band.querySelectorAll("a").length >= 3))) {
      const hdr = buildHeaderRow(band);
      if (hdr) { result.push(hdr); if (result.length >= 60) break; continue; }
    }
    if (droppableBand(band)) continue;
    const bandStyle = parseDataCs(band.getAttribute("data-cs")).style;
    // Promote a DOMINANT inner background up to the band: many designs put the section color/image on
    // a wrapper div inside a transparent <section> (e.g. a navy contact card). Without this the band
    // imports with no background. Adopt the bg of the descendant (within 3 levels) that wraps the most
    // content, when the band itself has none.
    if (!bandStyle.bg && !bandStyle.bgImage) {
      let best: { bg?: string; bgImage?: string; weight: number } | null = null;
      const within = elementChildren(band).flatMap((c) => [c, ...elementChildren(c), ...elementChildren(c).flatMap(elementChildren)]);
      for (const cand of within.slice(0, 60)) {
        const cs = parseDataCs(cand.getAttribute("data-cs")).style;
        if (!cs.bg && !cs.bgImage) continue;
        if (cs.bg && cs.bg === pageBg) continue;
        const weight = clean(cand.text).length;
        if (!best || weight > best.weight) best = { bg: cs.bg as string, bgImage: cs.bgImage as string, weight };
      }
      if (best && best.weight > 120) { if (best.bg) bandStyle.bg = best.bg; if (best.bgImage) bandStyle.bgImage = best.bgImage; }
    }
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
        if (grid.el === band) {
          // The band ITSELF is the card grid (cards are direct children) → emit a multi-column
          // row directly, no 1-col wrapper, no double-collect.
          const row: Record<string, unknown> = {
            type: "row", columns: Math.min(cols.length, 12), contentWidth: "boxed", gap: 16,
            _name: "Cards", children: cols, colStyles,
          };
          if (Object.keys(bandStyle).length) row._style = bandStyle;
          result.push(row);
          built = true;
          if (result.length >= 60) break;
          continue;
        }
        // Grid is nested inside the band → keep any intro content + the grid as a nested row.
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
