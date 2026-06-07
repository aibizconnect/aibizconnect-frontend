// Step 1b — main-page classification (PURE, no network/DB). Extracts a site's links and keeps
// ONLY real "main pages" (Home, About, Services, Pricing, Contact, …), ignoring product/
// listing/blog-post/category/cart/account/search/system/pagination/AMP/asset URLs. Deduped,
// language-folded. Keeps it deterministic + testable; the server action does the fetch.

export interface MainPage { title: string; url: string; path: string }

const IGNORE_PATH = /\/(products?|shop|store|collections?|categor(?:y|ies)|tags?|cart|checkout|basket|account|login|sign[-_]?in|register|wishlist|search|amp|listing|listings|property|properties)(\/|$)/i;
const IGNORE_BLOG_POST = /\/(blog|news|articles?|posts?)\/.+/i; // index ok; individual posts ignored
const IGNORE_SYSTEM = /\/(privacy|terms|cookies?|sitemap|feed|rss|404|thank[-_]?you)(\b|\/|\.|$)/i;
const IGNORE_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp[34]|xml|json|css|js)(\?|$)/i;
const IGNORE_PAGINATION = /([?&]page=|\/page\/\d+)/i;
const LANG_PREFIX = /^\/(en|fr|es|de|it|pt|nl|ar|zh|ja|en-us|en-gb|en-ca|fr-ca)(?=\/|$)/i;

function isMainPagePath(path: string): boolean {
  if (!path || path === "/") return true; // home
  if (IGNORE_PATH.test(path) || IGNORE_BLOG_POST.test(path) || IGNORE_SYSTEM.test(path)) return false;
  if (IGNORE_EXT.test(path) || IGNORE_PAGINATION.test(path)) return false;
  const segs = path.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  return segs.length <= 2; // main pages are shallow
}

function titleFromPath(path: string): string {
  const last = path.replace(/^\/|\/$/g, "").split("/").pop() || "Home";
  const t = last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  return t || "Home";
}

/** Normalize a path into a dedupe key (fold language prefix + common synonyms). */
function dedupeKey(path: string): string {
  let p = (path.replace(LANG_PREFIX, "") || "/").toLowerCase();
  p = p.replace(/^\/(about-us|aboutus|about-me)$/, "/about")
       .replace(/^\/(contact-us|contactus|get-in-touch)$/, "/contact")
       .replace(/^\/(our-services|what-we-do)$/, "/services");
  return p;
}

export function classifyMainPages(html: string, baseUrl: string): { main_pages: MainPage[]; count: number } {
  let origin = "";
  try { origin = new URL(baseUrl).origin; } catch { return { main_pages: [], count: 0 }; }

  const seen = new Map<string, MainPage>();
  seen.set("/", { title: "Home", url: `${origin}/`, path: "/" }); // home always counts

  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    const rawHref = m[1].trim();
    if (/^(mailto:|tel:|javascript:|#)/i.test(rawHref)) continue;
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
    let u: URL;
    try { u = new URL(rawHref, baseUrl); } catch { continue; }
    if (u.origin !== origin) continue;              // same site only
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (!isMainPagePath(path)) continue;
    const key = dedupeKey(path);
    if (seen.has(key)) continue;
    const title = text && text.length >= 2 && text.length <= 40 ? text : titleFromPath(path);
    seen.set(key, { title, url: `${origin}${path}`, path });
  }

  const main_pages = Array.from(seen.values()).slice(0, 15);
  return { main_pages, count: main_pages.length };
}

/**
 * Verify a page is a real, substantive page: a hero/heading + >=2 meaningful sections + >=1
 * CTA (Supervisor check S1_V10). Heuristic over the fetched HTML — pure, no network.
 */
export function verifyPageContent(html: string): { hasHero: boolean; sections: number; ctas: number; verified: boolean } {
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const headings = (html.match(/<h[123][\s>]/gi) || []).length;
  const sectionTags = (html.match(/<section[\s>]/gi) || []).length;
  const sections = Math.max(sectionTags, headings); // proxy for meaningful sections
  const ctaRe = /(contact|get started|get a quote|book now|book a|buy now|order|sign up|subscribe|learn more|call us|request|schedule|free|apply|join|shop now|donate)/i;
  const buttons = (html.match(/<button[\s>]/gi) || []).length;
  const ctaLinks = (html.match(/<a\b[^>]*>([\s\S]*?)<\/a>/gi) || []).filter((a) => ctaRe.test(a)).length;
  const ctas = buttons + ctaLinks;
  const hasHero = h1 >= 1 || headings >= 1;
  const verified = hasHero && sections >= 2 && ctas >= 1;
  return { hasHero, sections, ctas, verified };
}
