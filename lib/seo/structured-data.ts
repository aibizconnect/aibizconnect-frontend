/**
 * JSON-LD structured data builder for published/preview pages.
 *
 * Generative-engine optimization (GEO) and rich results depend on machine-readable
 * structured data. We emit an @graph of Organization + WebPage (+ optional Article
 * fields, FAQPage from FAQ sections, and BreadcrumbList) from the page's SEO config
 * and brand. Everything is defensive — missing fields are simply omitted.
 */

interface BuildArgs {
  url: string;                 // absolute page URL
  siteName?: string;           // organization / site name
  logoUrl?: string;            // organization logo
  title: string;               // page title
  description?: string;
  imageUrl?: string;           // social/hero image
  schemaType?: string;         // legacy single type (back-compat)
  schemaTypes?: string[];      // multiple active schemas (Organization, WebPage, Service…)
  author?: string;
  language?: string;           // e.g. "en"
  sections?: any[];            // page sections (to derive FAQ schema)
  breadcrumbs?: { name: string; url: string }[];
}

function origin(url: string): string {
  try { return new URL(url).origin; } catch { return url; }
}

/** Pull Q&A pairs out of any FAQ sections so AI engines get a FAQPage. */
function faqFromSections(sections?: any[]): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const scan = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (n.type === "faq" && Array.isArray(n.items)) {
      for (const it of n.items) if (it?.q && it?.a) out.push({ q: String(it.q), a: String(it.a) });
    }
    if (Array.isArray(n.children)) n.children.forEach((c: any) => (Array.isArray(c) ? c.forEach(scan) : scan(c)));
  };
  (sections ?? []).forEach(scan);
  return out;
}

export function buildJsonLd(a: BuildArgs): object | null {
  const graph: any[] = [];
  const org = origin(a.url);
  const orgNode: any = { "@type": "Organization", "@id": `${org}#organization`, name: a.siteName || a.title, url: org };
  if (a.logoUrl) orgNode.logo = a.logoUrl;
  graph.push(orgNode);

  const isArticle = a.schemaType === "Article";
  const pageNode: any = {
    "@type": isArticle ? "Article" : "WebPage",
    "@id": `${a.url}#${isArticle ? "article" : "webpage"}`,
    url: a.url,
    name: a.title,
    headline: a.title,
    isPartOf: { "@id": `${org}#organization` },
    publisher: { "@id": `${org}#organization` },
  };
  if (a.description) pageNode.description = a.description;
  if (a.imageUrl) pageNode.image = a.imageUrl;
  if (a.language) pageNode.inLanguage = a.language;
  if (a.author) pageNode.author = { "@type": "Person", name: a.author };
  graph.push(pageNode);

  // Specific business/product/service/event nodes when chosen (beyond Organization/
  // WebPage/Article, which are already emitted above). Supports MULTIPLE active
  // schemas (e.g. LocalBusiness + Service) — each becomes its own @graph node.
  const types = new Set<string>([...(a.schemaTypes ?? []), ...(a.schemaType ? [a.schemaType] : [])]);
  for (const t of types) {
    if (!t || ["Organization", "Article", "WebPage", "FAQPage"].includes(t)) continue;
    const node: any = { "@type": t, name: a.siteName || a.title, url: a.url };
    if (a.description) node.description = a.description;
    if (a.imageUrl) node.image = a.imageUrl;
    if (["LocalBusiness", "Organization"].includes(t) && a.logoUrl) node.logo = a.logoUrl;
    node.isPartOf = { "@id": `${org}#organization` };
    graph.push(node);
  }

  // FAQ schema from FAQ sections (or when the author explicitly chose FAQPage).
  const faqs = faqFromSections(a.sections);
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  if (a.breadcrumbs && a.breadcrumbs.length) {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: a.breadcrumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: b.url })),
    });
  }

  if (!graph.length) return null;
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Convenience: a ready-to-inject <script> innerHTML string (or "" if nothing). */
export function jsonLdScript(a: BuildArgs): string {
  const data = buildJsonLd(a);
  return data ? JSON.stringify(data) : "";
}
