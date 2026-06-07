import { extractPageContent } from "./page-generate";

/**
 * Server-only competitor research (NOT "use server"). For tenants with NO existing site: search the
 * web for similar businesses, fetch a few of the top results, and learn what high-performing sites in
 * the niche actually do (common sections, CTAs) — so the AI builds a SIMILAR-BUT-BETTER site.
 *
 * Best-effort: every step is wrapped + capped. No copying of competitor copy verbatim — we extract
 * structural PATTERNS (section topics + CTA styles) to inform the brief, never invented facts.
 */

const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "accept-language": "en-US,en;q=0.9" };

// Domains that aren't real competitor sites (directories, socials, marketplaces, search).
const JUNK = /(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|pinterest|reddit|yelp|tripadvisor|wikipedia|amazon|ebay|indeed|glassdoor|bbb\.org|google\.|bing\.|duckduckgo|maps\.|apple\.com|crunchbase|trustpilot|angi\.com|thumbtack|houzz|booking\.com|wordpress\.org|wix\.com|squarespace\.com|godaddy)/i;

async function fetchText(url: string, maxBytes = 500_000, timeout = 10000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout), redirect: "follow" });
    if (!res.ok) return null;
    return (await res.text()).slice(0, maxBytes);
  } catch { return null; }
}

/** Filter raw result URLs → real competitor homepages (drop junk, dedupe by domain, cap). */
function filterResultUrls(raw: string[], limit: number): string[] {
  const urls: string[] = [];
  const domains = new Set<string>();
  for (let href of raw) {
    const uddg = href.match(/[?&]uddg=([^&]+)/);
    if (uddg) { try { href = decodeURIComponent(uddg[1]); } catch { /* keep */ } }
    if (!/^https?:\/\//i.test(href)) continue;
    if (JUNK.test(href)) continue;
    try {
      const u = new URL(href);
      const dom = u.hostname.replace(/^www\./, "");
      if (domains.has(dom)) continue;
      domains.add(dom);
      urls.push(`${u.origin}/`);
      if (urls.length >= limit) break;
    } catch { /* skip */ }
  }
  return urls;
}

/** Real search API when configured (Serper → Brave → Bing). Returns raw result URLs or null. */
async function apiSearch(query: string): Promise<string[] | null> {
  const q = encodeURIComponent(query);
  if (process.env.SERPER_API_KEY) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST", headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 12 }), signal: AbortSignal.timeout(9000),
      });
      if (res.ok) { const j: any = await res.json(); const urls = (j?.organic ?? []).map((o: any) => o?.link).filter(Boolean); if (urls.length) return urls; }
    } catch { /* fall through */ }
  }
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${q}&count=12`, {
        headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(9000),
      });
      if (res.ok) { const j: any = await res.json(); const urls = (j?.web?.results ?? []).map((r: any) => r?.url).filter(Boolean); if (urls.length) return urls; }
    } catch { /* fall through */ }
  }
  if (process.env.BING_SEARCH_API_KEY) {
    try {
      const res = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${q}&count=12&mkt=en-US`, {
        headers: { "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY }, signal: AbortSignal.timeout(9000),
      });
      if (res.ok) { const j: any = await res.json(); const urls = (j?.webPages?.value ?? []).map((v: any) => v?.url).filter(Boolean); if (urls.length) return urls; }
    } catch { /* fall through */ }
  }
  return null;
}

/** Scrape DuckDuckGo's HTML endpoint as a no-key fallback. */
async function ddgSearch(query: string): Promise<string[]> {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 600_000, 10000);
  if (!html) return [];
  return Array.from(html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/gi)).map((m) => m[1]);
}

/**
 * Find a few real competitor homepage URLs. Uses a configured search API (Serper/Brave/Bing) when an
 * env key is present, else falls back to DuckDuckGo HTML scraping. Deduped by domain.
 */
export async function findCompetitorUrls(query: string, limit = 3): Promise<string[]> {
  const raw = (await apiSearch(query)) ?? (await ddgSearch(query));
  return filterResultUrls(raw, limit);
}

export interface CompetitorInsights {
  urls: string[];
  commonSections: string[];
  ctas: string[];
  brief: string;
}

/** Research similar businesses and synthesize a "what top sites do" brief (no verbatim copy). */
export async function researchCompetitors(industry?: string, city?: string, services?: string): Promise<CompetitorInsights | null> {
  const ind = (industry || "").trim();
  if (!ind) return null;
  const query = [ind, (city || "").trim()].filter(Boolean).join(" ") || ind;
  const urls = await findCompetitorUrls(query, 3);
  if (!urls.length) return null;

  const headingFreq = new Map<string, number>();
  const ctaFreq = new Map<string, number>();
  let fetched = 0;
  for (const url of urls) {
    const html = await fetchText(url, 400_000, 9000);
    if (!html) continue;
    fetched++;
    try {
      const ex = extractPageContent(html, url);
      for (const s of ex.sections) {
        const h = s.heading.trim().toLowerCase();
        if (h.length >= 3 && h.length <= 40) headingFreq.set(h, (headingFreq.get(h) ?? 0) + 1);
      }
      for (const c of ex.ctas) {
        const l = c.label.trim().toLowerCase();
        if (l.length >= 2 && l.length <= 24) ctaFreq.set(l, (ctaFreq.get(l) ?? 0) + 1);
      }
    } catch { /* skip */ }
  }
  if (!fetched) return null;

  const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  const commonSections = top(headingFreq, 8);
  const ctas = top(ctaFreq, 6);

  const brief =
    `Market research: studied ${fetched} leading ${ind} website(s)${city ? ` in ${city}` : ""}. ` +
    (commonSections.length ? `Top sites commonly include sections like: ${commonSections.join(", ")}. ` : "") +
    (ctas.length ? `Common calls-to-action: ${ctas.join(", ")}. ` : "") +
    `Build a SIMILAR-BUT-BETTER site than these: cover the topics customers expect, but with clearer structure, ` +
    `stronger hierarchy, modern design, and higher-converting CTAs. Tailor everything to ${services ? `our services (${services})` : "our business"} — do NOT copy their wording or claims.`;

  return { urls, commonSections, ctas, brief };
}
