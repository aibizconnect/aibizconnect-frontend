import { parse, type HTMLElement } from "node-html-parser";
import { applyCapturedStyle } from "./style-capture";

/**
 * Server-only HEADER / FOOTER extractor for the site importer.
 *
 * The body importer (html-importer.ts) deliberately DROPS site chrome. This module does the
 * complement: it recognises the page's <header> and <footer>, decomposes each into our editable
 * element types (logo image, nav menu, CTA button, social, link columns, contact, copyright) and
 * returns them as `row` sections — the exact shape used for the site-wide GLOBAL Header/Footer
 * blocks. So an imported site keeps one shared, editable header + footer (no per-page duplicates),
 * and the rest of every page is parsed the same way into ordered, editable sections.
 *
 * Everything is best-effort and defensive: if a piece can't be recognised it's skipped, never thrown.
 */

const SOCIAL_HOSTS: { re: RegExp; platform: string }[] = [
  { re: /facebook\.com|fb\.com|fb\.me/i, platform: "facebook" },
  { re: /instagram\.com|instagr\.am/i, platform: "instagram" },
  { re: /linkedin\.com|lnkd\.in/i, platform: "linkedin" },
  { re: /youtube\.com|youtu\.be/i, platform: "youtube" },
  { re: /(twitter\.com|x\.com)/i, platform: "x" },
  { re: /tiktok\.com/i, platform: "tiktok" },
  { re: /pinterest\.|pin\.it/i, platform: "pinterest" },
  { re: /wa\.me|whatsapp\.com/i, platform: "whatsapp" },
  { re: /t\.me|telegram/i, platform: "telegram" },
];
const CTA_WORDS = /\b(contact|get|book|call|sign\s?up|sign\s?in|log\s?in|buy|start|request|quote|schedule|subscribe|get started|free|demo|apply|join|shop|order|try|consult)\b/i;

const clean = (t: string): string => (t || "").replace(/\s+/g, " ").trim();
const tagOf = (el: HTMLElement) => (el?.rawTagName || "").toLowerCase();
/** Text of an element's OWN direct text nodes only (ignores nested submenu links). */
const directText = (el: HTMLElement): string =>
  clean((el.childNodes || []).filter((n: any) => n.nodeType === 3).map((n: any) => n.text || "").join(" "));
/** True if `node` is contained within `ancestor`. */
function isDescendant(ancestor: HTMLElement, node: HTMLElement): boolean {
  let p: any = node.parentNode;
  while (p) { if (p === ancestor) return true; p = p.parentNode; }
  return false;
}

interface MenuItem { label: string; href: string; children?: { label: string; href: string }[] }

/**
 * Build a HIERARCHICAL menu from a <nav>: each top-level entry is either a direct link or a
 * dropdown (its toggle label + the submenu links nested under it as `children`). Recognises the
 * common patterns: <ul><li><a>+<ul>…</ul></li></ul> and <nav><div.group><button>+<div.panel><a…>.
 */
function menuFromNav(navEl: HTMLElement, href: (u?: string | null) => string): MenuItem[] {
  const ul = navEl.querySelector("ul");
  const tops = (ul ? ul.childNodes : navEl.childNodes).filter((n: any) => n.nodeType === 1) as HTMLElement[];
  const items: MenuItem[] = [];
  const seenTop = new Set<string>();
  for (const node of tops) {
    if (items.length >= 10) break;
    if (node.querySelector && node.querySelector("img")) continue; // skip logo wrappers
    const tag = tagOf(node);

    // Direct top-level link (no dropdown).
    if (tag === "a") {
      const label = clean(node.text);
      if (!label || label.length > 40) continue;
      const k = label.toLowerCase(); if (seenTop.has(k)) continue; seenTop.add(k);
      items.push({ label, href: href(node.getAttribute("href")) });
      continue;
    }

    // Dropdown / group container: toggle label + nested submenu links.
    const toggle = node.querySelector("a, button, summary, span");
    let label = toggle ? (directText(toggle) || clean(toggle.text)) : directText(node);
    label = clean(label).replace(/[▾▼⌄▾▼⌄]+$/u, "").trim();
    if (!label || label.length > 40) continue;
    const k = label.toLowerCase(); if (seenTop.has(k)) continue; seenTop.add(k);

    const children: { label: string; href: string }[] = [];
    const seenChild = new Set<string>();
    for (const a of node.querySelectorAll("a")) {
      if (a === toggle) continue;
      const t = clean(a.text); if (!t || t.length > 50) continue;
      const ck = t.toLowerCase(); if (seenChild.has(ck)) continue; seenChild.add(ck);
      children.push({ label: t, href: href(a.getAttribute("href")) });
      if (children.length >= 12) break;
    }
    const toggleHref = toggle && tagOf(toggle) === "a" ? href(toggle.getAttribute("href")) : "#";
    items.push(children.length ? { label, href: toggleHref, children } : { label, href: toggleHref });
  }
  return items;
}

function isContentImage(src: string): boolean {
  const s = (src || "").toLowerCase();
  if (!s || s.startsWith("data:")) return false;
  return !/(sprite|favicon|pixel|spacer|1x1|loader)/.test(s);
}
function platformOf(url: string): string {
  for (const s of SOCIAL_HOSTS) if (s.re.test(url)) return s.platform;
  return "link";
}
function isSocial(url: string): boolean {
  return SOCIAL_HOSTS.some((s) => s.re.test(url));
}

export interface ImportedChrome {
  header: Record<string, unknown> | null;
  footer: Record<string, unknown> | null;
}

export function importChrome(html: string, baseUrl: string): ImportedChrome {
  let root: HTMLElement;
  try { root = parse(html, { comment: false }); } catch { return { header: null, footer: null }; }

  const base = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
  let origin = ""; try { origin = new URL(base).origin; } catch { /* ignore */ }
  const abs = (u?: string | null): string => { try { return u ? new URL(u, base).toString() : ""; } catch { return u || ""; } };
  // Same-origin links become root-relative paths (nicer/editable); external stay absolute.
  const href = (u?: string | null): string => {
    const a = abs(u);
    if (!a) return "#";
    try { const url = new URL(a); if (origin && url.origin === origin) return url.pathname + url.search || "/"; } catch { /* ignore */ }
    return a;
  };

  const q = (sel: string): HTMLElement | null => { try { return root.querySelector(sel); } catch { return null; } };
  const headerEl = q("header") || q('[role="banner"]') || q("nav");
  const footerEl = q("footer") || q('[role="contentinfo"]');

  let header: Record<string, unknown> | null = null;
  let footer: Record<string, unknown> | null = null;
  try { if (headerEl) header = headerToRow(headerEl, abs, href); } catch { /* skip */ }
  try { if (footerEl) footer = footerToRow(footerEl, abs, href); } catch { /* skip */ }
  return { header, footer };
}

// ── HEADER ───────────────────────────────────────────────────────────────────
function headerToRow(
  el: HTMLElement,
  abs: (u?: string | null) => string,
  href: (u?: string | null) => string,
): Record<string, unknown> | null {
  // Logo = first real <img> in the header.
  let logo: Record<string, unknown> | null = null;
  for (const img of el.querySelectorAll("img")) {
    const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-lazy-src");
    if (src && isContentImage(src)) {
      logo = { type: "image", url: abs(src), alt: clean(img.getAttribute("alt") || "Logo"), width: 170, align: "left", _name: "Logo", href: "/" };
      break;
    }
  }

  // Pick the richest <nav> in the header (desktop menu usually has the most links), then build a
  // hierarchical menu (top-level + submenu children) from it.
  const navs = el.querySelectorAll("nav");
  const navEl: HTMLElement = navs.length
    ? navs.reduce((best, n) => (n.querySelectorAll("a").length > best.querySelectorAll("a").length ? n : best), navs[0])
    : el;
  const items = menuFromNav(navEl, href);

  // CTA buttons: links/buttons in the header but OUTSIDE the nav (e.g. "Log in", "Start Free Trial").
  const ctas: Record<string, unknown>[] = [];
  const ctaSeen = new Set<string>();
  for (const a of el.querySelectorAll("a, button")) {
    if (navEl !== el && isDescendant(navEl, a)) continue; // already in the menu
    if (a.querySelector && a.querySelector("img")) continue; // skip the logo anchor
    const label = clean(a.text);
    if (!label || label.length > 24) continue;
    const cls = (a.getAttribute("class") || "").toLowerCase();
    const looksCta = /\b(btn|button|cta)\b/.test(cls) || CTA_WORDS.test(label);
    if (!looksCta) continue;
    const key = label.toLowerCase(); if (ctaSeen.has(key)) continue; ctaSeen.add(key);
    ctas.push({ type: "button", label, href: href(a.getAttribute("href")), variant: ctas.length === 0 ? "solid" : "outline", size: "sm", align: "right", _name: label });
    if (ctas.length >= 2) break;
  }

  const cols: Record<string, unknown>[][] = [];
  if (logo) cols.push([logo]);
  if (items.length) cols.push([{ type: "menu", orientation: "horizontal", align: "center", gap: 18, items, _name: "Main menu" }]);
  if (ctas.length) cols.push([...ctas]);
  if (!cols.length) return null;

  const columns = cols.length;
  const widths = columns === 3 ? [0.24, 0.56, 0.20] : columns === 2 ? [0.3, 0.7] : [1];
  return applyCapturedStyle({
    type: "row", columns, widths, gap: 16, valign: "center", contentWidth: "boxed",
    _name: "Header", children: cols,
  }, el.getAttribute("data-cs"));
}

// ── FOOTER ───────────────────────────────────────────────────────────────────
function footerToRow(
  el: HTMLElement,
  abs: (u?: string | null) => string,
  href: (u?: string | null) => string,
): Record<string, unknown> | null {
  const columns: Record<string, unknown>[][] = [];

  // 1) BRAND column: logo + tagline + social.
  const brand: Record<string, unknown>[] = [];
  for (const img of el.querySelectorAll("img")) {
    const src = img.getAttribute("src") || img.getAttribute("data-src");
    if (src && isContentImage(src)) { brand.push({ type: "image", url: abs(src), alt: clean(img.getAttribute("alt") || "Logo"), width: 150, align: "left", _name: "Logo" }); break; }
  }
  // tagline = first paragraph that isn't just links
  for (const p of el.querySelectorAll("p")) {
    const t = clean(p.text);
    if (t.length >= 20 && !/^©|copyright/i.test(t)) { brand.push({ type: "text", text: t, _name: "Tagline" }); break; }
  }
  // social links
  const socialLinks: { platform: string; url: string }[] = [];
  const socialSeen = new Set<string>();
  for (const a of el.querySelectorAll("a")) {
    const dest = abs(a.getAttribute("href"));
    if (dest && isSocial(dest)) { const p = platformOf(dest); if (!socialSeen.has(p)) { socialSeen.add(p); socialLinks.push({ platform: p, url: dest }); } }
  }
  if (socialLinks.length) brand.push({ type: "social", links: socialLinks, _name: "Social" });
  if (brand.length) columns.push(brand);

  // 2) LINK GROUPS: each <ul> with its heading → a column (heading + vertical menu).
  for (const ul of el.querySelectorAll("ul")) {
    const links = ul.querySelectorAll("a")
      .map((a) => ({ label: clean(a.text), href: href(a.getAttribute("href")) }))
      .filter((i) => i.label && !isSocial(i.href));
    if (!links.length) continue;
    const heading = headingBefore(ul);
    const col: Record<string, unknown>[] = [];
    if (heading) col.push({ type: "heading", text: heading, level: "h4", _name: heading });
    col.push({ type: "menu", orientation: "vertical", gap: 8, items: links.slice(0, 8), _name: heading || "Links" });
    columns.push(col);
    if (columns.length >= 5) break;
  }

  // 3) CONTACT column: mailto / tel / address lines (if a links group didn't already cover them).
  const contact: Record<string, unknown>[] = [];
  const email = el.querySelectorAll("a").find((a) => /^mailto:/i.test(a.getAttribute("href") || ""));
  const tel = el.querySelectorAll("a").find((a) => /^tel:/i.test(a.getAttribute("href") || ""));
  if (email || tel) {
    contact.push({ type: "heading", text: "Contact", level: "h4", _name: "Contact" });
    if (email) contact.push({ type: "text", text: "✉ " + clean(email.text || (email.getAttribute("href") || "").replace(/^mailto:/i, "")), _name: "Email" });
    if (tel) contact.push({ type: "text", text: "📞 " + clean(tel.text || (tel.getAttribute("href") || "").replace(/^tel:/i, "")), _name: "Phone" });
    if (columns.length < 6) columns.push(contact);
  }

  if (!columns.length) return null;

  // Copyright → append to the brand (first) column so it reads at the bottom-left.
  const copy = findCopyright(el);
  if (copy && columns[0]) columns[0].push({ type: "text", text: copy, fontSize: 12, _name: "Copyright" });

  return applyCapturedStyle({
    type: "row", columns: Math.min(columns.length, 6), gap: 24, valign: "top", contentWidth: "boxed",
    _name: "Footer", children: columns,
  }, el.getAttribute("data-cs"));
}

/** Find the nearest heading-ish text immediately preceding a <ul> within its parent. */
function headingBefore(ul: HTMLElement): string {
  const parent = ul.parentNode as HTMLElement | null;
  if (!parent || !parent.childNodes) return "";
  const kids = parent.childNodes.filter((n: any) => n.nodeType === 1) as HTMLElement[];
  const idx = kids.indexOf(ul);
  for (let i = idx - 1; i >= 0; i--) {
    const t = tagOf(kids[i]);
    if (/^h[1-6]$/.test(t) || t === "strong" || t === "p" || t === "span" || t === "div") {
      const txt = clean(kids[i].text);
      if (txt && txt.length <= 40) return txt;
    }
  }
  // Sometimes the heading is a sibling of the ul's parent (col wrapper).
  const gp = parent.parentNode as HTMLElement | null;
  const h = gp?.querySelector?.("h1,h2,h3,h4,h5,h6,strong");
  return h ? clean(h.text).slice(0, 40) : "";
}

function findCopyright(el: HTMLElement): string {
  for (const n of el.querySelectorAll("p, span, div, small")) {
    const t = clean(n.text);
    if (/©|copyright|\ball rights reserved\b/i.test(t) && t.length <= 160) return t;
  }
  return "";
}
