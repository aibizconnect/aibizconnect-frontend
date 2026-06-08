import { parse, type HTMLElement } from "node-html-parser";

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
  const out: Record<string, unknown>[] = [];

  // Buffer consecutive images so 3+ become a gallery, fewer stay as image blocks.
  let imgRun: string[] = [];
  const flushImgs = () => {
    if (imgRun.length >= 3) out.push({ type: "gallery", images: imgRun.slice(0, 12).map((url) => ({ url })) });
    else for (const url of imgRun) out.push({ type: "image", url });
    imgRun = [];
  };
  const seenText = new Set<string>();
  const pushText = (text: string, italic = false) => {
    const t = clean(text);
    if (t.length < 2) return;
    const key = t.slice(0, 120).toLowerCase();
    if (seenText.has(key)) return;
    seenText.add(key);
    out.push(italic ? { type: "text", text: t, italic: true } : { type: "text", text: t });
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
    try { heroEl.remove(); } catch { /* ignore */ }
    return hero;
  };

  const walk = (node: HTMLElement) => {
    for (const raw of node.childNodes) {
      const el = raw as HTMLElement;
      if (!el || el.nodeType !== 1) continue; // element nodes only
      const tag = tagOf(el);
      if (!tag || DROP.has(tag)) continue;

      if (/^h[1-6]$/.test(tag)) { flushImgs(); pushText(""); const text = clean(el.text); if (text) out.push({ type: "heading", text, level: tag }); continue; }
      if (tag === "img") { const src = el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("data-lazy-src"); if (src && isContentImage(src)) imgRun.push(abs(src)); continue; }
      if (tag === "picture") { const s = el.querySelector("img"); const src = s?.getAttribute("src") || s?.getAttribute("data-src"); if (src && isContentImage(src)) imgRun.push(abs(src)); continue; }
      if (tag === "ul" || tag === "ol") { flushImgs(); const items = el.querySelectorAll("li").map((li) => ({ text: clean(li.text) })).filter((i) => i.text); if (items.length) out.push({ type: "bullet-list", items: items.slice(0, 12), bulletStyle: tag === "ol" ? "number" : "check" }); continue; }
      if (tag === "hr") { flushImgs(); out.push({ type: "divider" }); continue; }
      if (tag === "blockquote") { flushImgs(); pushText(el.text, true); continue; }
      if (tag === "video") { flushImgs(); const src = el.getAttribute("src") || el.querySelector("source")?.getAttribute("src"); if (src) out.push({ type: "video", url: abs(src) }); continue; }
      if (tag === "iframe") { const src = el.getAttribute("src") || ""; if (/youtube|youtu\.be|vimeo|wistia/i.test(src)) { flushImgs(); out.push({ type: "video", url: src }); } continue; }
      if (tag === "form") { flushImgs(); out.push(formToContactForm(el)); continue; }
      if (tag === "button" || tag === "a") {
        if (looksLikeButton(el)) { flushImgs(); const label = clean(el.text); const href = abs(el.getAttribute("href") || "#"); if (label) out.push({ type: "button", label: label.slice(0, 40), href }); continue; }
        walk(el); continue; // ordinary link → recurse for nested text/images
      }
      if (tag === "p") {
        // A paragraph that is ONLY an image/link is handled by recursion; otherwise its text.
        const directText = clean(el.childNodes.filter((n) => n.nodeType === 3).map((n) => (n as any).text || "").join(" "));
        if (directText.length >= 2) { flushImgs(); pushText(el.text); }
        else walk(el);
        continue;
      }
      if (tag === "table") { flushImgs(); out.push({ type: "html", code: el.toString().slice(0, 20000) }); continue; }
      // Generic container (div/section/article/main/figure/header-less) → recurse to preserve order.
      walk(el);
    }
  };

  const hero = detectHero(main);
  if (hero) out.push(hero);
  walk(main);
  flushImgs();
  return out.slice(0, 80);
}
