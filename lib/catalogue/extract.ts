import { type CatalogueInput, type Vertical, VERTICALS } from "@/lib/catalogue/schema";
import { enforceEmailHygiene } from "@/lib/catalogue/hygiene";

/**
 * Build a DRAFT Knowledge Catalogue from a live site — the reusable engine behind
 * "a catalogue for every domain + every new client". Two honest sources, no fabrication:
 *   1) the site's own on-page JSON-LD (@graph) — richest: services, FAQs, ratings, NAP
 *   2) the app's presence enrichment (enrichFromPresence) — identity, industry, location, brand
 *
 * Output is ALWAYS `verification.verified: false` — a human confirms regulated fields (license,
 * ratings) before publish. See schema.isVerificationFresh / toPublicView.
 *
 * Usage (in the app runtime):
 *   const profile = await enrichFromPresence(tenantId, { websiteUrl });
 *   const jsonLd  = extractJsonLdGraph(html);       // from the fetched homepage
 *   const draft   = buildDraftCatalogue({ profile, jsonLd, siteUrl });
 *   parseCatalogue(draft);                           // validate, then review + publish
 */

/** Shape returned by enrichFromPresence (app/tenants/[tenantId]/website/wizard-actions.ts). */
export interface SiteProfile {
  businessName?: string;
  description?: string;
  industry?: string;
  services?: string; // free-text blob, comma/line separated
  audience?: string;
  socialLinks?: string[];
  logoUrl?: string;
  country?: string;
  city?: string;
  sourceUrl?: string;
}

export function verticalFromIndustry(industry?: string): Vertical {
  const s = (industry || "").toLowerCase();
  if (/real ?estate|realtor|broker|homes?|property|listing/.test(s)) return "real_estate";
  if (/mortgage|lend|loan|finance/.test(s)) return "mortgage";
  if (/shop|store|retail|ecommerce|commerce|product/.test(s)) return "retail";
  return (VERTICALS.includes(s as Vertical) ? (s as Vertical) : "services");
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "item";

/** Split a free-text services blob into distinct service names. */
export function splitServices(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;•\n·|]|(?: - )/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 80)
    .slice(0, 12);
}

// ── JSON-LD extraction ───────────────────────────────────────────────
type AnyNode = Record<string, any>;
const typesOf = (n: AnyNode): string[] =>
  (Array.isArray(n?.["@type"]) ? n["@type"] : n?.["@type"] ? [n["@type"]] : []).map(String);
const hasType = (n: AnyNode, t: string) => typesOf(n).some((x) => x.toLowerCase() === t.toLowerCase());
const txt = (v: any): string | undefined =>
  typeof v === "string" ? v : typeof v?.["@value"] === "string" ? v["@value"] : Array.isArray(v) ? txt(v[0]) : undefined;

/** Pull every JSON-LD object out of an HTML string, flattened (handles @graph + arrays). */
export function extractJsonLdGraph(html: string): AnyNode[] {
  const out: AnyNode[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item?.["@graph"] && Array.isArray(item["@graph"])) out.push(...item["@graph"]);
        else out.push(item);
      }
    } catch {
      /* ignore malformed block */
    }
  }
  return out;
}

/** Map a JSON-LD @graph into catalogue fields (structured, high-fidelity). */
export function catalogueFromJsonLd(graph: AnyNode[], siteUrl?: string): Partial<CatalogueInput> {
  const draft: Partial<CatalogueInput> = {};
  const biz = graph.find((n) => ["Organization", "LocalBusiness", "RealEstateAgent", "ProfessionalService", "Store", "FinancialService"].some((t) => hasType(n, t)));

  if (biz) {
    const addr = biz.address || {};
    draft.identity = {
      display_name: txt(biz.name) || "This business",
      short_bio: txt(biz.description),
      nap: {
        phone: txt(biz.telephone),
        email: txt(biz.email),
        address: {
          streetAddress: txt(addr.streetAddress),
          locality: txt(addr.addressLocality),
          region: txt(addr.addressRegion),
          postalCode: txt(addr.postalCode),
          country: txt(addr.addressCountry),
        },
      },
      brand: { logo_url: txt(biz.logo) || txt(biz.image), site_url: txt(biz.url) || siteUrl },
    };
    // areaServed → service_areas
    const areas = Array.isArray(biz.areaServed) ? biz.areaServed : biz.areaServed ? [biz.areaServed] : [];
    const areaNames = areas.map((a: any) => txt(a) || txt(a?.name)).filter(Boolean) as string[];
    if (areaNames.length) draft.service_areas = areaNames.map((n) => ({ id: slug(n), name: n }));
    // aggregateRating → reviews.aggregate (kept as draft; stays gated until verified)
    const agg = biz.aggregateRating;
    if (agg && (agg.ratingValue != null)) {
      draft.reviews = { aggregate: { rating: Number(agg.ratingValue), count: Number(agg.reviewCount ?? agg.ratingCount ?? 0) } };
    }
  }

  // Services: OfferCatalog itemListElement, or standalone Service nodes
  const services: NonNullable<CatalogueInput["services"]> = [];
  const pushService = (name?: string, description?: string) => {
    if (!name) return;
    if (services.some((s) => s.name === name)) return;
    services.push({ id: slug(name), name, description });
  };
  for (const n of graph) {
    if (hasType(n, "OfferCatalog") && Array.isArray(n.itemListElement)) {
      for (const el of n.itemListElement) {
        const offered = el?.itemOffered || el;
        pushService(txt(offered?.name) || txt(el?.name), txt(offered?.description));
      }
    }
    if (hasType(n, "Service")) pushService(txt(n.name), txt(n.description));
  }
  if (services.length) draft.services = services.slice(0, 20);

  // FAQs from FAQPage
  const faqPage = graph.find((n) => hasType(n, "FAQPage"));
  if (faqPage && Array.isArray(faqPage.mainEntity)) {
    const faqs = faqPage.mainEntity
      .map((q: any) => ({ q: txt(q?.name), a: txt(q?.acceptedAnswer?.text) }))
      .filter((f: any) => f.q && f.a);
    if (faqs.length) draft.faqs = faqs.slice(0, 20);
  }
  return draft;
}

/** Map presence enrichment into catalogue fields (identity + a coarse service list). */
export function catalogueFromSiteProfile(p: SiteProfile): Partial<CatalogueInput> {
  const draft: Partial<CatalogueInput> = {
    vertical: verticalFromIndustry(p.industry),
    identity: {
      display_name: p.businessName || "This business",
      professional_role: p.industry,
      short_bio: p.description,
      nap: { address: { locality: p.city, country: p.country } },
      brand: { logo_url: p.logoUrl, site_url: p.sourceUrl },
    },
  };
  const svc = splitServices(p.services);
  if (svc.length) draft.services = svc.map((name) => ({ id: slug(name), name }));
  return draft;
}

/** Deep-ish merge: JSON-LD (structured) wins; presence fills gaps. Always verified:false. */
export function buildDraftCatalogue(input: {
  profile?: SiteProfile;
  jsonLd?: AnyNode[];
  siteUrl?: string;
  vertical?: Vertical;
}): CatalogueInput {
  const fromProfile = input.profile ? catalogueFromSiteProfile(input.profile) : {};
  const fromLd = input.jsonLd?.length ? catalogueFromJsonLd(input.jsonLd, input.siteUrl) : {};

  const identity = {
    ...(fromProfile.identity || {}),
    ...(fromLd.identity || {}),
    display_name:
      fromLd.identity?.display_name && fromLd.identity.display_name !== "This business"
        ? fromLd.identity.display_name
        : fromProfile.identity?.display_name || fromLd.identity?.display_name || "This business",
    short_bio: fromLd.identity?.short_bio || fromProfile.identity?.short_bio,
    professional_role: fromProfile.identity?.professional_role,
    nap: { ...(fromProfile.identity?.nap || {}), ...(fromLd.identity?.nap || {}) },
    brand: { ...(fromProfile.identity?.brand || {}), ...(fromLd.identity?.brand || {}) },
  };

  const canonical = input.siteUrl || identity.brand?.site_url;
  const draft: CatalogueInput = {
    vertical: input.vertical || fromProfile.vertical || verticalFromIndustry(input.profile?.industry),
    verification: { verified: false, verified_fields: [], freshness_ttl_days: 30 },
    identity,
    // Prefer richer JSON-LD services; fall back to the coarse profile list.
    services: (fromLd.services?.length ? fromLd.services : fromProfile.services) || [],
    service_areas: fromLd.service_areas || [],
    faqs: fromLd.faqs || [],
    reviews: fromLd.reviews || {}, // aggregate here stays gated until verified
    citations: canonical
      ? { canonical_url: canonical, cite_as: identity.display_name, source_pages: [{ title: `${identity.display_name} — Home`, url: canonical }] }
      : {},
  };
  // Reserve @ali.realtor for the realtor business; scrub it from any other property.
  return enforceEmailHygiene(draft);
}
