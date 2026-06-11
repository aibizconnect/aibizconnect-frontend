import { parse, type HTMLElement } from "node-html-parser";
import { applyCapturedStyle, applyCapturedTypo, parseDataCs, gridColumnCount } from "./style-capture";
import { linkFromHref } from "@/lib/sections/links";

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
  let skipIndex = -1; // out.length at the moment skipEl was encountered (where the grid SITS in DOM order)
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
    if (!CTA_WORDS.test(clean(el.text)) || clean(el.text).length > 32) return false;
    // CTA wording alone isn't enough on a RENDERED import: a plain nav/footer link named "Contact"
    // would steal the header CTA slot and vanish from link lists. With computed styles available,
    // require real button chrome — a fill, or a rounded padded pill. (Raw-HTML imports keep the
    // text-only heuristic: no data-cs to consult.)
    const cs = el.getAttribute("data-cs");
    if (cs == null) return true;
    const { style } = parseDataCs(cs);
    return !!style.bg || (typeof style.radius === "number" && style.radius > 0 && (Number(style.pl) || 0) >= 8);
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
      // SIBLING label (Stitch: <div><label>Your Name</label><input placeholder="John Doe"></div> —
      // no for=, not wrapping). Check DIRECT children only of up to 2 ancestors, so a field never
      // adopts another field's label (other fields' labels live one wrapper deeper).
      p = inp.parentNode;
      for (let i = 0; i < 2 && p; i++) {
        const lab = ((p.childNodes || []) as any[]).find((n) => n.nodeType === 1 && (n.rawTagName || "").toLowerCase() === "label");
        if (lab && clean(lab.text)) return clean(lab.text);
        p = p.parentNode;
      }
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
      // Skip a subtree (e.g. a card grid handled separately) but REMEMBER where it sat, so the
      // caller can re-insert the grid row at its true DOM position (the footer © line comes AFTER
      // the link columns — hardcoding intro-before-grid hoisted it to the top of the band).
      if (skipEl && el === skipEl) { flushImgs(); skipIndex = out.length; continue; }
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

      // Link LIST (footer "Quick Links"/"Compliance", mid-page link groups): a ul/div whose
      // children are all plain (non-button) links → a LIST of linked items, NOT a menu — D-219
      // (Ali): "our menu is in the Header" — the only Navigation Menu is the header bar, built by
      // buildHeaderRow; link groups everywhere else are Lists. Each item keeps its link, and the
      // list carries the captured link color/size so footer links keep the design's color (D-221).
      if (tag === "ul" || tag === "div" || tag === "nav") {
        const lis = (el.childNodes || []).filter((n: any) => n.nodeType === 1) as HTMLElement[];
        // A link counts only if it has REAL link text (after stripping inline icons). This excludes
        // icon-only social links whose text is a bare ligature ("face_nod","share") that would
        // otherwise pollute a footer list.
        const linkEls = lis.map((k) => (tagOf(k) === "a" ? k : k.querySelector("a")))
          .filter((a): a is HTMLElement => !!a && !looksLikeButton(a) && !!cleanText(a) && !/^[a-z][a-z0-9_]*$/.test(clean(a.text)));
        if (lis.length >= 2 && linkEls.length >= 2 && linkEls.length >= Math.ceil(lis.length * 0.7)) {
          flushImgs();
          const items = linkEls.slice(0, 12).map((a) => {
            const raw = a.getAttribute("href") || "";
            return { text: cleanText(a).slice(0, 40), link: linkFromHref(raw.startsWith("#") ? raw : abs(raw)) };
          });
          const list: Record<string, unknown> = { type: "bullet-list", items, bulletStyle: "none" };
          const typo = parseDataCs(linkEls[0].getAttribute("data-cs")).typo;
          if (typo.color) { list.textColor = typo.color; list.color = typo.color; }
          if (typo.fontSize) list.fontSize = typo.fontSize;
          out.push(list);
          continue;
        }
      }

      if (/^h[1-6]$/.test(tag)) { flushImgs(); const text = cleanText(el); if (text) out.push(applyCapturedTypo({ type: "heading", text, level: tag }, el.getAttribute("data-cs"))); continue; }
      if (tag === "img") { const src = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-lazy-src"); if (src && isContentImage(src)) imgRun.push({ url: abs(src), ...imgSizeFrom(el) }); continue; }
      if (tag === "picture") { const s = el.querySelector("img"); const src = s?.getAttribute("src") || s?.getAttribute("data-src"); if (src && isContentImage(src)) imgRun.push({ url: abs(src), ...(s ? imgSizeFrom(s) : {}) }); continue; }
      if (tag === "ul" || tag === "ol") {
        flushImgs();
        const lis = el.querySelectorAll("li");
        const items = lis.map((li) => {
          const it: Record<string, unknown> = { text: clean(li.text) };
          const a = li.querySelector("a");
          if (a && !looksLikeButton(a)) { // item link survives translation (D-219)
            const raw = a.getAttribute("href") || "";
            const lv = linkFromHref(raw.startsWith("#") ? raw : abs(raw));
            if (lv) it.link = lv;
          }
          return it;
        }).filter((i) => i.text);
        if (items.length) {
          const b: Record<string, unknown> = { type: "bullet-list", items: items.slice(0, 12), bulletStyle: tag === "ol" ? "number" : "check" };
          // D-221: every text-bearing element carries its captured color — lists were the leak.
          const typo = parseDataCs((lis[0] || el).getAttribute("data-cs")).typo;
          if (typo.color) { b.textColor = typo.color; b.color = typo.color; }
          if (typo.fontSize) b.fontSize = typo.fontSize;
          out.push(b);
        }
        continue;
      }
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
    out = []; imgRun = []; seenText = new Set<string>(); skipEl = skip ?? null; skipIndex = -1;
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
  const findCardGrid = (band: HTMLElement, flexOnly = false): { el: HTMLElement; cards: HTMLElement[]; cols: number } | null => {
    type Cand = { el: HTMLElement; cards: HTMLElement[]; cols: number; depth: number; score: number; flex: boolean };
    const cands: Cand[] = [];
    const depthOf = (el: HTMLElement): number => { let d = 0; let p: any = el; while (p && p !== band) { p = p.parentNode; d++; } return d; };
    // A grid INSIDE a <form> (e.g. Stitch's 2-up name/email field wrapper) belongs to the
    // contact-form block — emitting it as a row would duplicate the fields as loose text.
    const insideForm = (el: HTMLElement): boolean => { let p: any = el.parentNode; while (p && p !== band) { if ((p.rawTagName || "").toLowerCase() === "form") return true; p = p.parentNode; } return false; };
    // Include the BAND ITSELF as a candidate: many designs (incl. Stitch/Tailwind output) put the
    // cards as DIRECT children of the <section> with no inner wrapper — querySelectorAll skips the
    // band, so those grids were missed and collapsed to a single column.
    for (const el of [band, ...band.querySelectorAll("div, ul, section")]) {
      const kids = elementChildren(el).filter((k) => !DROP.has(tagOf(k)));
      if (kids.length < 2 || kids.length > 12) continue;
      // A column counts if it has a heading, real text, OR an image — the last case matters for
      // split hero/feature layouts (text column + image column) where one side is image-only and
      // would otherwise be ignored, collapsing a 2-column row into a single stack. Icon-font
      // ligature words ("location_on") are NOT real text — cleanText strips them, so an icon+label
      // flex pair doesn't masquerade as a 2-card grid.
      const cardish = kids.filter((k) => (k.querySelector && (k.querySelector("h1,h2,h3,h4,h5,h6") || k.querySelector("img,picture,svg"))) || cleanText(k).length > 8);
      if (cardish.length < 2 || cardish.length < Math.ceil(kids.length * 0.6)) continue;
      const cs = el.getAttribute("data-cs") || "";
      // A VERTICAL flex column is a stack of bands, NOT a multi-column card grid — disqualify it
      // entirely so a whole page's sections aren't squashed into columns (D-149).
      if (/flexDirection:column/.test(cs)) continue;
      if (insideForm(el)) continue;
      const gc = gridColumnCount(cs);
      const isFlexGrid = /display:(flex|grid)/.test(cs) || gc >= 2;
      cands.push({ el, cards: cardish, cols: gc || cardish.length, depth: depthOf(el), score: kids.length * (isFlexGrid ? 3 : 1), flex: isFlexGrid });
    }
    // The OUTERMOST real flex/grid wins — it's the page's LAYOUT grid (D-173). Scoring by card
    // count picked the denser INNER grid (a 2x2 features grid beat the 2-col [features | bio]
    // split), demoting the sibling column to loose intro text above the cards. Nested grids are
    // handled by recursion in blocksFor. Non-flex fallback kept for raw-HTML imports (no data-cs),
    // but never for nested passes (a plain block container is not a layout grid).
    const flex = cands.filter((c) => c.flex).sort((a, b) => a.depth - b.depth || b.score - a.score);
    if (flex.length) return flex[0];
    if (flexOnly) return null;
    let best: Cand | null = null;
    for (const c of cands) if (!best || c.score > best.score) best = c;
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
    let logo = ""; let logoEl: HTMLElement | null = null; let navLinkEl: HTMLElement | null = null;
    let cta: Record<string, unknown> | null = null;
    for (const a of el.querySelectorAll("a, button")) {
      const label = cleanText(a);                          // strip inline icon ligatures
      if (!label || label.length > 40) continue;
      if (/^[a-z][a-z0-9_]*$/.test(clean(a.text))) continue; // skip icon-only links ("menu","share")
      if (looksLikeButton(a)) { if (!cta) cta = buildButton(a); continue; }
      if (!logo) { logo = label; logoEl = a; continue; }  // first plain link = brand/logo
      if (!navItems.some((n) => n.label === label)) { if (!navLinkEl) navLinkEl = a; navItems.push({ label, href: abs(a.getAttribute("href") || "#") }); }
    }
    if (!navItems.length && !cta) return null;
    const cols: Record<string, unknown>[][] = [];
    // D-221: the brand heading + menu carry their captured colors (they were synthetic before).
    cols.push([applyCapturedTypo({ type: "heading", text: logo || "Brand", level: "h3" }, logoEl?.getAttribute("data-cs"))]);
    if (navItems.length) {
      const menu: Record<string, unknown> = { type: "menu", items: navItems.slice(0, 8), orientation: "horizontal" };
      const navColor = navLinkEl ? parseDataCs(navLinkEl.getAttribute("data-cs")).typo.color : undefined;
      if (navColor) menu.color = navColor;
      cols.push([menu]);
    }
    if (cta) cols.push([cta]);
    const row: Record<string, unknown> = { type: "row", columns: cols.length, contentWidth: "boxed", _name: "Header", children: cols };
    const st = parseDataCs(el.getAttribute("data-cs")).style;
    if (Object.keys(st).length) row._style = st;
    return row;
  };

  // Recursive layout builder (D-173): find the OUTERMOST grid in `root`, build one row per
  // column-chunk of its cards (a 2-col grid with 4 cards → two 2-col rows, i.e. a true 2x2 —
  // the renderer draws exactly `columns` cells per row, so wrapping must become extra rows),
  // and RECURSE into each card so nested grids (the features 2x2 inside the [features | bio]
  // split) keep their own structure instead of flattening. Content before/after the grid stays
  // in DOM order via skipIndex (the footer © line must remain BELOW the link columns).
  const blocksFor = (root: HTMLElement, depth: number): Record<string, unknown>[] => {
    const grid = depth < 3 ? findCardGrid(root, depth > 0) : null;
    if (!grid || grid.cards.length < 2) return collectBlocks(root);
    const cols: Record<string, unknown>[][] = [];
    const colStyles: Record<string, unknown>[] = [];
    for (const card of grid.cards) {
      const b = blocksFor(card, depth + 1);
      if (b.length) { cols.push(b); colStyles.push(parseDataCs(card.getAttribute("data-cs")).style); }
    }
    if (cols.length < 2) return collectBlocks(root); // non-destructive fallback — full content
    const colCount = Math.min(grid.cols >= 2 ? grid.cols : cols.length, 12);
    const gridStyle = parseDataCs(grid.el.getAttribute("data-cs")).style;
    // The design's color often sits on a WRAPPER between root and grid (Stitch: white <section>
    // → navy rounded p-16 card → 2-col grid). Adopt the nearest such wrapper's bg/bgImage +
    // radius + padding onto the grid row, else the navy card vanishes (D-171).
    if (!gridStyle.bg && !gridStyle.bgImage) {
      let anc: any = grid.el.parentNode;
      for (let i = 0; i < 4 && anc && anc !== root; i++) {
        const ws = parseDataCs(anc.getAttribute?.("data-cs")).style;
        if ((ws.bg && ws.bg !== pageBg) || ws.bgImage) {
          for (const k of ["bg", "bgImage", "radius", "pt", "pr", "pb", "pl"]) {
            if (ws[k] != null && gridStyle[k] == null) gridStyle[k] = ws[k];
          }
          break;
        }
        anc = anc.parentNode;
      }
    }
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < cols.length; i += colCount) {
      rows.push({
        type: "row", columns: colCount, contentWidth: "boxed", gap: 16,
        _name: "Cards", children: cols.slice(i, i + colCount), colStyles: colStyles.slice(i, i + colCount),
      });
    }
    // Wrapper style only when the grid stays ONE row — repeating a navy card bg per chunk
    // would draw the background twice.
    if (rows.length === 1 && Object.keys(gridStyle).length) rows[0]._style = gridStyle;
    if (grid.el === root) return rows;
    const rest = collectBlocks(root, grid.el); // root content WITHOUT the grid subtree
    const at = skipIndex >= 0 ? skipIndex : rest.length;
    return [...rest.slice(0, at), ...rows, ...rest.slice(at)];
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
    const bandBlocks = blocksFor(band, 0);
    if (!bandBlocks.length) continue;
    // Merge a lone grid row into the band ONLY when their backgrounds agree — a navy rounded
    // card inset in a white section must stay nested (band keeps the white frame + its padding),
    // not be flattened into one full-width navy band.
    const loneRow = bandBlocks.length === 1 && bandBlocks[0].type === "row" ? bandBlocks[0] : null;
    const loneRowStyle = (loneRow?._style as Record<string, unknown>) || {};
    const bgConflict = !!(loneRowStyle.bg || loneRowStyle.bgImage) && !!(bandStyle.bg || bandStyle.bgImage)
      && (loneRowStyle.bg !== bandStyle.bg || !!loneRowStyle.bgImage !== !!bandStyle.bgImage);
    if (loneRow && !bgConflict) {
      // The band IS one grid row → emit it directly (no 1-col wrapper); band style fills gaps.
      const merged = { ...bandStyle, ...loneRowStyle };
      if (Object.keys(merged).length) loneRow._style = merged;
      result.push(loneRow);
    } else {
      const row: Record<string, unknown> = { type: "row", columns: 1, contentWidth: "boxed", _name: bandName(bandBlocks), children: [bandBlocks] };
      if (Object.keys(bandStyle).length) row._style = bandStyle;
      result.push(row);
    }
    if (result.length >= 60) break;
  }

  // 4) Fallback: if no bands were wrapped (unusual markup), emit the flat block list.
  if (!result.some((r) => r.type === "row")) result.push(...collectBlocks(main));

  return result.slice(0, 60);
}
