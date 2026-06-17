/**
 * Industry profile registry (D-381, ratified Gemini + Copilot). The typed, versioned definition of
 * the capability MODULES and which an industry gets by default. Genesis reads this to enable the
 * right `tenant_modules` per tenant. UNIVERSAL CORE (contacts+tagging, pipeline, site, forms→CRM,
 * booking, conversations, AI agent, starter automations, basic reputation/reporting) is NOT a
 * module — every tenant always has it. Only the OPTIONAL capabilities below are toggled.
 */

export type ModuleKey =
  | "payments"        // POS / invoices / estimates / "paid clients"
  | "idx"             // real-estate listings (CREA DDF / RESO)
  | "vow"             // client portal: saved searches + favourites
  | "email_campaigns"
  | "sms_campaigns"
  | "trigger_links"
  | "store"           // e-commerce storefront
  | "saas_billing"    // ABC's OWN subscription billing of tenants (platform-only)
  | "advanced_ai";    // AI image gen + advanced LLM features

export interface ModuleDef { key: ModuleKey; name: string; description: string; /** needs a tenant action before it works */ needsAction?: string; platformOnly?: boolean }

export const MODULES: Record<ModuleKey, ModuleDef> = {
  idx:             { key: "idx", name: "Listings (IDX)", description: "MLS listings search, detail pages, area pages.", needsAction: "Runs on sample data until the tenant's IDX/VOW board approval lands." },
  vow:             { key: "vow", name: "Client Portal (VOW)", description: "Saved searches + favourites for signed-in buyers." },
  payments:        { key: "payments", name: "Payments / POS", description: "Products, invoices, estimates, pay links.", needsAction: "Connect Stripe in Settings → Integrations." },
  store:           { key: "store", name: "Store", description: "E-commerce storefront + checkout.", needsAction: "Connect Stripe in Settings → Integrations." },
  email_campaigns: { key: "email_campaigns", name: "Email Campaigns", description: "Bulk email campaigns (drafts-only)." },
  sms_campaigns:   { key: "sms_campaigns", name: "SMS Campaigns", description: "Bulk SMS campaigns + trigger links." },
  trigger_links:   { key: "trigger_links", name: "Trigger Links", description: "Tracked links that tag a contact on click." },
  advanced_ai:     { key: "advanced_ai", name: "Advanced AI", description: "AI image generation + advanced LLM features." },
  saas_billing:    { key: "saas_billing", name: "SaaS Billing", description: "Subscription billing of tenants (trial/client + tier).", platformOnly: true, needsAction: "Connect the platform Stripe + set Price IDs." },
};

export interface IndustryProfile {
  key: string;
  name: string;
  description: string;
  defaultModules: ModuleKey[];     // enabled by Genesis
  recommendedModules: ModuleKey[]; // available, off by default
}

export const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    key: "real_estate",
    name: "Real Estate Agent / Brokerage",
    description: "Listings + lead capture for agents. Core + IDX, no POS.",
    defaultModules: ["idx", "vow", "sms_campaigns", "trigger_links"],
    recommendedModules: ["email_campaigns", "advanced_ai"],
  },
  {
    key: "mortgage",
    name: "Mortgage / Finance",
    description: "Lead capture + nurture for brokers. No IDX, no POS.",
    defaultModules: ["sms_campaigns", "trigger_links"],
    recommendedModules: ["email_campaigns", "advanced_ai"],
  },
  {
    key: "retail",
    name: "Retail / E-commerce",
    description: "Sell products online + in person.",
    defaultModules: ["payments", "store", "email_campaigns"],
    recommendedModules: ["sms_campaigns", "advanced_ai"],
  },
  {
    key: "services",
    name: "Local Services (default)",
    description: "Generic service business — site, CRM, booking, light marketing.",
    defaultModules: ["email_campaigns"],
    recommendedModules: ["payments", "sms_campaigns", "trigger_links"],
  },
  {
    key: "platform",
    name: "AI Biz Connect (platform)",
    description: "ABC itself — dogfoods the blueprint + its own SaaS billing.",
    defaultModules: ["saas_billing", "email_campaigns", "sms_campaigns"],
    recommendedModules: ["advanced_ai"],
  },
];

export const DEFAULT_PROFILE_KEY = "services";

export function profileFor(key?: string | null): IndustryProfile {
  const k = (key || "").toLowerCase().trim();
  return INDUSTRY_PROFILES.find((p) => p.key === k) ?? INDUSTRY_PROFILES.find((p) => p.key === DEFAULT_PROFILE_KEY)!;
}

/**
 * Map a website-template key (lib/design/templates.ts → "real-estate", "ecommerce", "dental"…) to an
 * industry-profile key here. Only the templates with a distinct capability profile are mapped; every
 * other template falls through to the default `services` profile (core + light marketing, no IDX/POS).
 */
const TEMPLATE_TO_INDUSTRY: Record<string, string> = {
  "real-estate": "real_estate",
  ecommerce: "retail",
};
export function industryKeyForTemplate(templateKey?: string | null): string {
  const k = (templateKey || "").toLowerCase().trim();
  return TEMPLATE_TO_INDUSTRY[k] ?? DEFAULT_PROFILE_KEY;
}
