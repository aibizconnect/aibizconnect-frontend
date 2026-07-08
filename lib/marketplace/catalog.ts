/**
 * Marketplace catalog — the typed, in-code list of purchasable add-ons (mirrors the
 * lib/tools/registry.ts pattern: definitions live in code; per-tenant STATE lives in the
 * marketplace_purchases table). Adding an add-on = one entry here + (for a live one) a
 * price and the feature/module it unlocks.
 *
 * Status is data, not code — "soon" ships the shelf before the tool does:
 *   available — buyable now (has a real price + unlock)
 *   beta      — buyable, early
 *   soon      — visible but not buyable (the roadmap on display)
 */

export type MarketplaceStatus = "available" | "beta" | "soon";

export interface MarketplaceItem {
  key: string;
  name: string;
  category: string;
  blurb: string;
  /** Monthly price in cents. Ignored for `soon` items. TODO: confirm final prices. */
  priceCents: number;
  interval: "month";
  status: MarketplaceStatus;
  icon: string; // emoji — cheap, self-contained
  /** What activating this add-on unlocks. */
  unlocks: { featureKey?: string; moduleKey?: string; navRoute?: string };
}

export const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  // ---- Live pilot: wraps the existing, already-built AI Tools Pro suite ----
  {
    key: "tools_pro",
    name: "AI Tools Pro",
    category: "AI & Content",
    blurb: "Unlock the full Pro suite — business plans, VSL scripts, ebooks, decks, hiring kits, coaching, and more. Brand-aware, drafts only.",
    priceCents: 2900, // $29/mo — TODO: confirm final price
    interval: "month",
    status: "available",
    icon: "🧰",
    unlocks: { featureKey: "tools_pro", navRoute: "tools" },
  },

  // ---- Coming soon (mirrors docs/addons/addons-roadmap.md) — visible, not yet buyable ----
  {
    key: "seo_geo_report",
    name: "SEO & Geo Ranking Report",
    category: "Marketing",
    blurb: "See exactly where you rank locally and nationally, with a plain-English action list to climb. Powered by tools we already run.",
    priceCents: 0,
    interval: "month",
    status: "soon",
    icon: "🔎",
    unlocks: { navRoute: "strategy" },
  },
  {
    key: "keyword_report",
    name: "Keyword Research & Reporting",
    category: "Marketing",
    blurb: "Find the searches your customers actually type, with volume, difficulty, and monthly tracking.",
    priceCents: 0,
    interval: "month",
    status: "soon",
    icon: "📈",
    unlocks: {},
  },
  {
    key: "social_planner_pro",
    name: "Social Media Planner Pro",
    category: "Marketing",
    blurb: "Plan and schedule a month of posts across Facebook & Instagram from one calendar.",
    priceCents: 0,
    interval: "month",
    status: "soon",
    icon: "🗓️",
    unlocks: { navRoute: "marketing" },
  },
  {
    key: "google_ads",
    name: "Google Ads Manager",
    category: "Advertising",
    blurb: "Launch and manage Google Search campaigns with guardrails, without touching the Ads console.",
    priceCents: 0,
    interval: "month",
    status: "soon",
    icon: "🎯",
    unlocks: {},
  },
  {
    key: "meta_ads",
    name: "Meta Ads Manager",
    category: "Advertising",
    blurb: "Run Facebook & Instagram ad campaigns with simple budgets and creative from your post library.",
    priceCents: 0,
    interval: "month",
    status: "soon",
    icon: "📣",
    unlocks: {},
  },
];

export function listMarketplaceItems(): MarketplaceItem[] {
  return MARKETPLACE_ITEMS;
}

export function getMarketplaceItem(key: string): MarketplaceItem | null {
  return MARKETPLACE_ITEMS.find((i) => i.key === key) ?? null;
}
