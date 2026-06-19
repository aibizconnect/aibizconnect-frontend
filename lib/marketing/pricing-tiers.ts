/**
 * Client-safe pricing types + defaults (NO server imports — safe to import from "use client"
 * components and from the server-side pricing source). The DB-backed reader lives in pricing.ts.
 */

export interface Tier {
  name: string; tagline: string; m: number | null; a: number | null;
  cta: string; href: string; head: string; feats: string[]; highlight: boolean;
  trialDays?: number;
}

/** Shown only when the tenant has no plans yet (or pre-DB). Mirrors the original Claude Design tiers. */
export const DEFAULT_TIERS: Tier[] = [
  { name: "Starter", tagline: "For solo pros getting online fast.", m: 39, a: 31, cta: "Start free", href: "/start",
    head: "Includes", feats: ["AI website & funnels", "CRM up to 1,000 contacts", "Email & SMS nurture", "Online booking & calendar", "1 user seat"], highlight: false, trialDays: 14 },
  { name: "Pro", tagline: "For growing teams that sell.", m: 89, a: 71, cta: "Start free", href: "/start",
    head: "Everything in Starter, plus", feats: ["Unlimited contacts & pipelines", "24/7 AI concierge", "Automation workflows", "Payments & invoicing", "Up to 5 user seats"], highlight: true },
  { name: "Premium", tagline: "For high-volume teams scaling fast.", m: 399, a: 319, cta: "Start free", href: "/start",
    head: "Everything in Pro, plus", feats: ["Higher limits & priority AI", "Advanced analytics & reporting", "Custom integrations", "Up to 15 user seats", "Priority support"], highlight: false },
  { name: "Agency", tagline: "Manage many clients & brands.", m: 699, a: 559, cta: "Start free", href: "/start",
    head: "Everything in Premium, plus", feats: ["Multi-site & white-label", "Unlimited client sub-accounts", "Team roles & permissions", "API & advanced integrations", "Dedicated success manager"], highlight: false },
  { name: "Enterprise", tagline: "For larger orgs with custom needs.", m: null, a: null, cta: "Contact sales", href: "/contact",
    head: "Everything in Agency, plus", feats: ["Custom contracts & SLA", "SSO & advanced security", "Onboarding & migration", "Volume pricing", "Dedicated team"], highlight: false },
];
