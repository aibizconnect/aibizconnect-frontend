import { extractPageContent } from "./page-generate";

/**
 * Server-only competitor research (NOT "use server"). For tenants with NO existing site: search the
 * web for similar businesses, fetch a few of the top results, and learn what high-performing sites in
 * the niche actually do (common sections, CTAs) — so the AI builds a SIMILAR-BUT-BETTER site.
 *
 * Best-effort: every step is wrapped + capped. No copying of competitor copy verbatim — we extract
 * structural PATTERNS (section topics + CTA styles) to inform the brief, never invented facts.
 */

const UA = { "user-agent": "Mozilla/5.0 (compatible; AIBizConnectBot/1.0)", "accept-language": "en-US,en;q=0.9" };

// Domains that aren't real competitor sites (directories, socials, marketplaces, search).
const JUNK = /(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|pinterest|reddit|yelp|tripadvisor|wikipedia|amazon|ebay|indeed|glassdoor|bbb\.org|google\.|bing\.|duckduckgo|maps\.|apple\.com|crunchbase|trustpilot|angi\.com|thumbtack|houzz|booking\.com|wordpress\.org|wix\.com|squarespace\.com|godaddy)/i;

async function fetchText(url: string, maxBytes = 500_000, timeout = 10000): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout), redirect: "follow" });
    if (!res.ok) return null;
    return (await res.text()).slice(0, maxBytes);
  } catch { return null; }
}

/** Find a few real competitor homepage URLs via DuckDuckGo's HTML endpoint (deduped by domain). */
export async function findCompetitorUrls(query: string, limit = 3): Promise<string[]> {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 600_000, 10000);
  if (!html) return [];
  const urls: string[] = [];
  const domains = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/gi)) {
    let href = m[1];
    // DDG wraps targets as /l/?uddg=<encoded>.
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
