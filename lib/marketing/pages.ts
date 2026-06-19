import { INDUSTRIES } from "./industries";
import { FEATURES } from "./features";

/**
 * Registry of the AI-built public marketing pages (aibizconnect.app). These are code-rendered (not
 * tenant website_pages), so they don't appear in the visual editor — this registry powers the
 * platform "Site Pages" console where the team can SEE every page and ask the AI to change it.
 */
export interface MarketingPage { route: string; title: string; desc: string; group: string }

const FEATURE_DESC: Record<string, string> = {
  crm: "CRM & pipelines feature page.", "ai-builder": "AI Builder feature page.",
  "websites-funnels": "Websites & Funnels feature page.", automations: "Automations feature page.",
  "consumer-portal": "Consumer Portal feature page.", marketplace: "Marketplace feature page.", templates: "Templates feature page.",
};

export const MARKETING_PAGES: MarketingPage[] = [
  { group: "Main", route: "/", title: "Home", desc: "Hero, dashboard mock, AI concierge, industries, modules, testimonials, pricing, FAQ, CTA." },
  { group: "Main", route: "/product", title: "Platform", desc: "Product overview — tour, modules, concierge, automations, built-in, how-it-works." },
  { group: "Main", route: "/pricing", title: "Pricing", desc: "5 tiers, billing toggle, compare table, power-ups, FAQ." },

  { group: "Solutions", route: "/solutions", title: "Solutions hub", desc: "Industry cards, why-vertical, stat bar." },
  ...Object.entries(INDUSTRIES).map(([slug, d]) => ({ group: "Solutions", route: `/solutions/${slug}`, title: d.eyebrow.replace(/^For /, ""), desc: d.h1 })),

  ...Object.entries(FEATURES).map(([slug, d]) => ({ group: "Features", route: `/${slug}`, title: d.eyebrow, desc: FEATURE_DESC[slug] || d.h1 })),

  { group: "Company", route: "/about", title: "About", desc: "Mission, stats, values, CTA." },
  { group: "Company", route: "/contact", title: "Contact", desc: "Lead form (→ CRM) + contact options." },

  { group: "Resources", route: "/resources", title: "Resources hub", desc: "Blog / Guides / Webinars hub." },
  { group: "Resources", route: "/blog", title: "Blog", desc: "Article list." },
  { group: "Resources", route: "/guides", title: "Guides", desc: "Setup guides." },
  { group: "Resources", route: "/webinars", title: "Webinars", desc: "Live & on-demand sessions." },
];

export const MARKETING_PAGE_GROUPS = ["Main", "Solutions", "Features", "Company", "Resources"];
