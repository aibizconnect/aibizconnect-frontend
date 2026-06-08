/**
 * Server-only per-page SEO/GEO meta extractor. Pulls the source page's real <title>, meta
 * description, canonical, OG image, and JSON-LD schema @type(s) so an imported page keeps its
 * search/answer-engine signals instead of synthetic ones. Best-effort; returns only what it finds.
 */

export interface ExtractedSeo {
  title?: string;
  description?: string;
  image?: string;
  canonical?: string;
  schema_type?: string;
  schemas?: string[];
}

const clean = (t: string): string => (t || "").replace(/\s+/g, " ").trim();

function metaContent(html: string, attr: "name" | "property", key: string): string {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']*)["']`, "i");
  const m = re.exec(html) || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key}["']`, "i").exec(html);
  return m ? clean(m[1]) : "";
}

function jsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks.slice(0, 8)) {
    const json = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    let data: any;
    try { data = JSON.parse(json); } catch { continue; }
    const nodes: any[] = Array.isArray(data) ? data : data?.["@graph"] && Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    for (const node of nodes) {
      const t = node?.["@type"];
      if (typeof t === "string") types.add(t);
      else if (Array.isArray(t)) for (const x of t) if (typeof x === "string") types.add(x);
    }
  }
  return [...types];
}

export function extractSeo(html: string): ExtractedSeo {
  const out: ExtractedSeo = {};
  try {
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const title = titleTag ? clean(titleTag[1]) : "";
    const ogTitle = metaContent(html, "property", "og:title");
    if (title || ogTitle) out.title = (title || ogTitle).slice(0, 120);

    const desc = metaContent(html, "name", "description") || metaContent(html, "property", "og:description");
    if (desc) out.description = desc.slice(0, 320);

    const ogImg = metaContent(html, "property", "og:image");
    if (ogImg) out.image = ogImg;

    const can = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html);
    if (can) out.canonical = clean(can[1]);

    const schemas = jsonLdTypes(html);
    if (schemas.length) { out.schemas = schemas; out.schema_type = schemas[0]; }
  } catch { /* best-effort */ }
  return out;
}
