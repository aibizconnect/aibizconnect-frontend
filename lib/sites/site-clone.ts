/**
 * Server-only helpers to faithfully import an existing website (NOT "use server"). Two strategies:
 *  - discoverSitemapUrls + pickUrlForType: find the real URL for each page (sitemap.xml first, then
 *    same-origin homepage links) so we copy EVERY page, not just homepage-linked ones.
 *  - buildExactCopyIframe: a pixel-faithful snapshot of a page — its own HTML with linked CSS inlined,
 *    scripts stripped, rendered inside an isolated sandboxed <iframe srcdoc> (safe; can't touch our app).
 *    A <base href> makes the site's relative images/CSS load from the original origin.
 *
 * All fetches are best-effort and capped. No PII, no AI spend.
 */

// Real browser UA — "bot" UAs get blocked by Cloudflare/WAF, which would break importing the site.
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", accept: "text/html,application/xhtml+xml" };

export async function fetchPage(url: string, maxBytes = 600_000): Promise<string | null> {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const res = await fetch(u.toString(), { headers: UA, signal: AbortSignal.timeout(12000), redirect: "follow" });
    if (!res.ok) return null;
    return (await res.text()).slice(0, maxBytes);
  } catch { return null; }
}

function originOf(url: string): string {
  try { return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin; } catch { return ""; }
}

/** Read sitemap.xml / sitemap_index.xml (one level of nesting) → same-origin page URLs (capped). */
export async function discoverSitemapUrls(baseUrl: string): Promise<string[]> {
  const origin = originOf(baseUrl);
  if (!origin) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const addLocs = (xml: string) => {
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const u = m[1].trim();
      try {
        const abs = new URL(u, origin);
        if (abs.origin !== origin) continue;
        if (/\.(xml|jpg|jpeg|png|gif|webp|svg|pdf|css|js)(\?|$)/i.test(abs.pathname)) continue;
        const key = abs.toString();
        if (!seen.has(key)) { seen.add(key); out.push(key); }
      } catch { /* skip */ }
    }
  };
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`];
  for (const c of candidates) {
    if (out.length >= 40) break;
    const xml = await fetchPage(c, 800_000);
    if (!xml) continue;
    // If it's an index, follow up to 3 child sitemaps.
    const childMaps = Array.from(xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>[\s\S]*?<\/sitemap>/gi)).map((m) => m[1].trim()).slice(0, 3);
    if (childMaps.length) {
      for (const cm of childMaps) { const cx = await fetchPage(cm, 800_000); if (cx) addLocs(cx); if (out.length >= 40) break; }
    } else {
      addLocs(xml);
    }
    if (out.length) break;
  }
  return out.slice(0, 40);
}

const TYPE_RE: Record<string, RegExp> = {
  home: /^\/?$|\/(home|index)(\.\w+)?\/?$/i,
  about: /about|team|story|who-we-are|our-/i,
  services: /service|product|solution|offer|what-we-do|portfolio|work|capabilit/i,
  pricing: /pric|plan|package|rates?/i,
  testimonials: /testimonial|review|client|case-stud/i,
  contact: /contact|get-in-touch|quote|book|appointment/i,
  faq: /faq|questions|help/i,
  blog_index: /blog|news|articles|insights|resources/i,
};

/** Resolve the best source URL for a page type: prefer a sitemap URL, else a homepage link. */
export function pickUrlForType(sitemapUrls: string[], homeHtml: string, baseUrl: string, pageType: string): string | undefined {
  const re = TYPE_RE[pageType];
  const origin = originOf(baseUrl);
  if (re) {
    const hit = sitemapUrls.find((u) => { try { return re.test(new URL(u).pathname); } catch { return false; } });
    if (hit) return hit;
  }
  if (!re) return undefined;
  const aRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRe.exec(homeHtml))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ");
    if (!re.test(href) && !re.test(text)) continue;
    if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
    try { const abs = new URL(href, baseUrl); if (abs.origin === origin) return abs.toString(); } catch { /* skip */ }
  }
  return undefined;
}

// ── Exact copy (pixel-faithful snapshot) ─────────────────────────────────────────

function stripDangerous(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function headStyles(html: string): string {
  let css = "";
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) css += `\n${m[1]}`;
  return css;
}

function stylesheetHrefs(html: string, origin: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try { out.push(new URL(href, origin).toString()); } catch { /* skip */ }
    if (out.length >= 8) break;
  }
  return out;
}

function bodyInner(html: string): string {
  const m = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

/**
 * Build an `html` section whose `code` is an isolated, sandboxed iframe rendering a faithful snapshot
 * of the page (inlined CSS, scripts removed, original origin as <base> so images/fonts load).
 */
export async function buildExactCopyIframe(pageHtml: string, pageUrl: string): Promise<Record<string, unknown> | null> {
  const origin = originOf(pageUrl);
  if (!origin) return null;
  const cleaned = stripDangerous(pageHtml);
  let css = headStyles(cleaned);
  const sheets = stylesheetHrefs(cleaned, origin);
  for (const s of sheets) {
    if (css.length > 600_000) break;
    const text = await fetchPage(s, 400_000);
    if (text) css += `\n/* ${s} */\n${text}`;
  }
  css = css.slice(0, 700_000);
  const body = bodyInner(cleaned);
  // Rough height estimate so the (script-less) iframe shows the whole page.
  const textLen = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").length;
  const height = Math.min(8000, Math.max(1600, Math.round(textLen / 1.4)));

  const doc =
    `<!doctype html><html><head><meta charset="utf-8"><base href="${origin}/">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<style>${css}</style></head><body>${body}</body></html>`;
  const srcdoc = doc.replace(/"/g, "&quot;");
  const code = `<iframe title="Imported page" sandbox="allow-same-origin allow-popups" loading="lazy" style="width:100%;min-height:${height}px;border:0;display:block" srcdoc="${srcdoc}"></iframe>`;
  return { type: "html", code };
}
