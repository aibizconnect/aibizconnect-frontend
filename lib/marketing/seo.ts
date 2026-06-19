/**
 * SEO/GEO structured data for the public marketing site (aibizconnect.app). The new hand-built
 * marketing pages bypass the tenant-site schema pipeline (lib/seo/structured-data.ts), so we emit
 * our own JSON-LD here. GEO (AI-visibility) lives or dies on structured data — this is the #1 fix
 * from the SEO+GEO report (GEO 49 → "structured data missing").
 *
 * Truthful by design: Organization + WebSite + SoftwareApplication + the real on-page testimonials
 * as Review nodes + AggregateOffer from the published pricing. No fabricated star ratings.
 */
export const SITE_URL = "https://aibizconnect.app";
const abs = (p: string) => (p.startsWith("http") ? p : `${SITE_URL}${p}`);

/** Content-freshness signal (report task: AI retrieval favors recently-updated content). Bump on
 * meaningful content updates. ISO for schema dateModified; label for the visible footer line. */
export const SITE_UPDATED = "2026-06-18";
export const SITE_UPDATED_LABEL = "June 2026";

const ORG_DESC =
  "AIBizConnect OS is the AI Business OS for small business — one platform that builds your website, fills your CRM, books your calendar, and markets for you, with a 24/7 AI concierge that answers, qualifies, and books for you.";

/** Real on-page testimonials, marked up as Review nodes (no invented numeric ratings). */
export const REVIEWS = [
  { author: "Marcus Reyes", body: "I replaced my website host, CRM, and email tool with AIBizConnect — and my AI books showings while I sleep." },
  { author: "Dana Whitfield", body: "Setup took an afternoon. The concierge qualifies leads better than the VA I was paying $2k a month for." },
  { author: "Priya Anand", body: "We run six client brands from one login. White-label sub-accounts are a game changer for our agency." },
];

/** Site-wide @graph: Organization + WebSite + SoftwareApplication (with offers + reviews). */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        name: "AIBizConnect",
        legalName: "AIBizConnect OS",
        url: SITE_URL,
        logo: abs("/brand/AIBizConnect-logo-primary.png"),
        image: abs("/brand/AIBizConnect-logo-primary.png"),
        description: ORG_DESC,
        founder: { "@type": "Person", name: "Alireza Bolourchi" },
        telephone: "+1-416-727-7111",
        sameAs: ["https://www.aibizconnect.ca"],
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-416-727-7111",
          contactType: "sales",
          areaServed: ["CA", "US"],
          availableLanguage: ["en"],
          url: `${SITE_URL}/contact`,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: "AIBizConnect OS",
        description: ORG_DESC,
        publisher: { "@id": `${SITE_URL}#organization` },
        inLanguage: "en",
        dateModified: SITE_UPDATED,
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}#software`,
        name: "AIBizConnect OS",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        url: SITE_URL,
        description: ORG_DESC,
        publisher: { "@id": `${SITE_URL}#organization` },
        featureList: [
          "AI website & funnel builder",
          "CRM & sales pipelines",
          "Email & SMS marketing automation",
          "Online booking & calendar",
          "24/7 AI concierge",
          "Consumer portal & payments",
          "White-label agency sub-accounts",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: "39",
          highPrice: "699",
          offerCount: "5",
          url: `${SITE_URL}/pricing`,
        },
        review: REVIEWS.map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.author },
          reviewBody: r.body,
          itemReviewed: { "@id": `${SITE_URL}#software` },
        })),
      },
    ],
  };
}

/** FAQPage node — AI engines cite pages with FAQ schema dramatically more often. */
export function faqPageGraph(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Home-page FAQ — visible content + drives the FAQPage schema. */
export const HOME_FAQ = [
  { q: "What is AIBizConnect OS?", a: "AIBizConnect OS is an all-in-one AI Business Operating System for small businesses. It builds your website, runs your CRM and sales pipeline, books your calendar, and markets for you — with a 24/7 AI concierge that answers visitors, qualifies leads, and books appointments in your voice." },
  { q: "How fast can I get my business online?", a: "Most businesses go live the same day. You answer a few questions, AI generates your site, CRM, funnels, and automations on-brand, and you publish when it's ready — usually within minutes to an hour." },
  { q: "Do I need any technical skills?", a: "No. AIBizConnect builds everything for you and you edit in plain language — describe what you want and the AI makes the change. There's nothing to code and no plugins to wire up." },
  { q: "What does the AI concierge do?", a: "The concierge replies to website and social inquiries in seconds, qualifies and routes every lead, books appointments straight into your calendar, and follows up automatically — day or night, in your voice." },
  { q: "What tools does AIBizConnect replace?", a: "One login replaces your website host, CRM, email/SMS marketing tool, booking software, and funnel builder — they all share the same data, so nothing needs syncing." },
  { q: "Is there a free trial?", a: "Yes. Every plan starts with a 14-day free trial with full access. No credit card is required and you can cancel anytime. Plans range from $39/mo (Starter) to $699/mo (Agency), plus a custom Enterprise tier." },
];
