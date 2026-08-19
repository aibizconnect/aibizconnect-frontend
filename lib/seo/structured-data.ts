/**
 * JSON-LD structured data builder for published/preview pages.
 *
 * Generative-engine optimization (GEO) and rich results depend on machine-readable
 * structured data. We emit an @graph of Organization + WebPage (+ optional Article
 * fields, FAQPage from FAQ sections, and BreadcrumbList) from the page's SEO config
 * and brand. Everything is defensive — missing fields are simply omitted.
 *
 * When a published Knowledge Catalogue is supplied (migration 0086), we additionally
 * emit a business node (RealEstateAgent / ProfessionalService / …) with an OfferCatalog
 * of services, areaServed, knowsAbout, gated credentials (license) and aggregateRating,
 * and merge the catalogue FAQs into the FAQPage. Regulated fields (license number,
 * ratings) are only emitted when verification is fresh — see schema.isVerificationFresh.
 */
import { isVerificationFresh, type Catalogue, type Vertical } from "@/lib/catalogue/schema";

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
  // GEO (D-209): local-business facts — auto-extracted from imported pages (NAP) or set in
  // page SEO; enrich the LocalBusiness node so maps/AI engines get the real entity.
  telephone?: string;
  email?: string;
  address?: string;            // freeform postal address
  areaServed?: string;         // city/region
  // Knowledge Catalogue (0086): when present, emit the business/offer/credential graph.
  catalogue?: Catalogue;
}

/** schema.org business type for each catalogue vertical (tenants.industry_key). */
const VERTICAL_SCHEMA_TYPE: Record<Vertical, string> = {
  real_estate: "RealEstateAgent",
  mortgage: "FinancialService",
  retail: "Store",
  services: "ProfessionalService",
  platform: "Organization",
};

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

/**
 * Build the business node for a Knowledge Catalogue: the typed LocalBusiness subtype
 * with contact/address, areaServed, knowsAbout, an OfferCatalog of services, and —
 * only when verification is fresh — hasCredential (license) and aggregateRating.
 */
function catalogueBusinessNode(doc: Catalogue, org: string, fallbackUrl: string): object {
  const id = doc.identity;
  const type = VERTICAL_SCHEMA_TYPE[doc.vertical] ?? "LocalBusiness";
  const fresh = isVerificationFresh(doc);

  const node: any = {
    "@type": type,
    "@id": `${org}#business`,
    name: id.display_name,
    url: id.brand.site_url || org || fallbackUrl,
    isPartOf: { "@id": `${org}#organization` },
  };
  const desc = id.short_bio || id.long_bio;
  if (desc) node.description = desc;
  if (id.brand.logo_url) node.image = id.brand.logo_url;
  if (id.nap.phone) node.telephone = id.nap.phone;
  if (id.nap.email) node.email = id.nap.email;
  if (id.languages.length) node.knowsLanguage = id.languages;
  if (id.domain_expertise.length) node.knowsAbout = id.domain_expertise;

  const addr = id.nap.address;
  if (addr && (addr.streetAddress || addr.locality || addr.region || addr.postalCode || addr.country)) {
    node.address = {
      "@type": "PostalAddress",
      ...(addr.streetAddress ? { streetAddress: addr.streetAddress } : {}),
      ...(addr.locality ? { addressLocality: addr.locality } : {}),
      ...(addr.region ? { addressRegion: addr.region } : {}),
      ...(addr.postalCode ? { postalCode: addr.postalCode } : {}),
      ...(addr.country ? { addressCountry: addr.country } : {}),
    };
  }
  if (id.nap.geo?.lat != null && id.nap.geo?.lng != null) {
    node.geo = { "@type": "GeoCoordinates", latitude: id.nap.geo.lat, longitude: id.nap.geo.lng };
  }
  if (doc.service_areas.length) {
    node.areaServed = doc.service_areas.map((ar) => ar.name);
  }

  // OfferCatalog of services
  if (doc.services.length) {
    node.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: doc.services.map((s) => {
        const offer: any = {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: s.name,
            ...(s.description ? { description: s.description } : {}),
          },
        };
        if ((s.price.model === "fixed" || s.price.model === "hourly") && s.price.amount != null) {
          offer.priceSpecification = {
            "@type": "PriceSpecification",
            price: s.price.amount,
            priceCurrency: s.price.currency || "CAD",
            ...(s.price.model === "hourly" ? { unitText: "HOUR" } : {}),
          };
        } else if (s.price.model === "free") {
          offer.price = 0;
          offer.priceCurrency = s.price.currency || "CAD";
        }
        return offer;
      }),
    };
  }

  // Credentials — license shown only when verification is fresh; identifier (number) gated harder.
  if (doc.credentials.is_licensed) {
    const cred: any = { "@type": "EducationalOccupationalCredential", credentialCategory: "license" };
    if (doc.credentials.regulator) cred.recognizedBy = { "@type": "Organization", name: doc.credentials.regulator };
    if (fresh && doc.credentials.license_number) cred.identifier = doc.credentials.license_number;
    node.hasCredential = cred;
  }

  // Aggregate rating — only when fresh (never assert unverified numbers to AI engines).
  if (fresh && doc.reviews.aggregate) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: doc.reviews.aggregate.rating,
      reviewCount: doc.reviews.aggregate.count,
    };
  }

  return node;
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
    // GEO enrichment (D-209): real NAP on business-like nodes.
    if (a.telephone) node.telephone = a.telephone;
    if (a.email) node.email = a.email;
    if (a.address) node.address = { "@type": "PostalAddress", streetAddress: a.address };
    if (a.areaServed) node.areaServed = a.areaServed;
    node.isPartOf = { "@id": `${org}#organization` };
    graph.push(node);
  }

  // Knowledge Catalogue business node (RealEstateAgent / ProfessionalService / …).
  if (a.catalogue) graph.push(catalogueBusinessNode(a.catalogue, org, a.url));

  // FAQ schema from FAQ sections AND the catalogue (deduped by question text).
  const faqs = faqFromSections(a.sections);
  if (a.catalogue?.faqs.length) {
    const seen = new Set(faqs.map((f) => f.q.trim().toLowerCase()));
    for (const f of a.catalogue.faqs) {
      const key = f.q.trim().toLowerCase();
      if (!seen.has(key)) { faqs.push({ q: f.q, a: f.a }); seen.add(key); }
    }
  }
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
