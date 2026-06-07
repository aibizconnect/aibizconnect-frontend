// Shared (non-server) wizard constants + pure helpers. Imported by BOTH the client
// wizard UI and the "use server" wizard-actions (which may only export async fns).

export const BRAND_TONES = ["professional", "friendly", "luxury", "bold", "minimal"] as const;
export const TEMPLATE_FAMILIES = ["realtor", "agency", "local-service", "portfolio", "startup"] as const;
export type BrandTone = (typeof BRAND_TONES)[number];
export type TemplateFamily = (typeof TEMPLATE_FAMILIES)[number];

export const SUBDOMAIN_BASE = "aibizconnect.app";

// Hosts that may never be claimed as a tenant subdomain.
export const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "mail", "smtp", "ftp", "ns", "dns", "cdn",
  "static", "assets", "img", "images", "media", "blog", "help", "support",
  "status", "dashboard", "billing", "pay", "checkout", "auth", "login",
  "signup", "register", "account", "accounts", "go", "link", "links",
  "preview", "staging", "dev", "test", "demo", "aibizconnect", "system",
]);

/**
 * Curated per-family design themes — adapted from Anthropic's theme-factory palettes
 * (Ocean Depths, Tech Innovation, Forest Canopy, Modern Minimalist, Sunset Boulevard)
 * with web-safe Google Font pairings (all present in lib/fonts.ts GOOGLE_FONTS, so they
 * load on the published page via collectPageFonts). Each AI build inherits a cohesive
 * color + typography system, not just one accent color.
 */
export interface FamilyTheme {
  label: string;
  themeName: string;       // source theme-factory palette
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
}

export const FAMILY_THEME: Record<TemplateFamily, FamilyTheme> = {
  realtor: {
    label: "Real Estate", themeName: "Ocean Depths",
    primary: "#1a2332", secondary: "#457b9d", accent: "#2d8b8b",
    headingFont: "Playfair Display", bodyFont: "Inter",
  },
  agency: {
    label: "Agency", themeName: "Tech Innovation",
    primary: "#0066ff", secondary: "#1e1e1e", accent: "#00b3b3",
    headingFont: "Space Grotesk", bodyFont: "Inter",
  },
  "local-service": {
    label: "Local Service", themeName: "Forest Canopy",
    primary: "#2d4a2b", secondary: "#7d8471", accent: "#5b7a4f",
    headingFont: "Poppins", bodyFont: "Inter",
  },
  portfolio: {
    label: "Portfolio", themeName: "Modern Minimalist",
    primary: "#36454f", secondary: "#708090", accent: "#475569",
    headingFont: "Archivo", bodyFont: "Inter",
  },
  startup: {
    label: "Startup", themeName: "Sunset Boulevard",
    primary: "#e76f51", secondary: "#264653", accent: "#f4a261",
    headingFont: "Sora", bodyFont: "Inter",
  },
};

/**
 * Wizard color palettes with NAMED ROLES so the user understands what each color drives:
 * background, surface (cards), text, muted text, primary (buttons/brand), secondary, accent, and
 * link color. Primary/secondary/accent + background are applied to the live site; text/link are
 * stored on the brand theme for the editor.
 */
export interface WizardPalette {
  name: string; dark?: boolean;
  background: string; surface: string; text: string; muted: string;
  primary: string; secondary: string; accent: string; link: string;
}
export const WIZARD_PALETTES: WizardPalette[] = [
  { name: "Ocean",      background: "#ffffff", surface: "#f1f5f9", text: "#0f172a", muted: "#64748b", primary: "#1a2332", secondary: "#457b9d", accent: "#2d8b8b", link: "#2563eb" },
  { name: "Midnight", dark: true, background: "#0b1220", surface: "#131c2e", text: "#e2e8f0", muted: "#94a3b8", primary: "#22d3ee", secondary: "#6366f1", accent: "#818cf8", link: "#38bdf8" },
  { name: "Forest",     background: "#ffffff", surface: "#f3f6f1", text: "#1f2a24", muted: "#6b7280", primary: "#2d4a2b", secondary: "#5b7a4f", accent: "#7d8471", link: "#2f855a" },
  { name: "Sunset",     background: "#fffdf9", surface: "#fff4ec", text: "#2b2620", muted: "#8a7f72", primary: "#e76f51", secondary: "#264653", accent: "#f4a261", link: "#d2603a" },
  { name: "Royal",      background: "#ffffff", surface: "#f5f3ff", text: "#1e1b2e", muted: "#6b7280", primary: "#4f46e5", secondary: "#7c3aed", accent: "#a855f7", link: "#4f46e5" },
  { name: "Mono",       background: "#ffffff", surface: "#f8fafc", text: "#111827", muted: "#6b7280", primary: "#111827", secondary: "#374151", accent: "#6b7280", link: "#2563eb" },
  { name: "Coral",      background: "#fffafa", surface: "#fff1f2", text: "#2a1a1d", muted: "#9b8588", primary: "#e11d48", secondary: "#881337", accent: "#fb7185", link: "#e11d48" },
  { name: "Sand",       background: "#fbf7f0", surface: "#f3ece0", text: "#2c2620", muted: "#8c8170", primary: "#b45309", secondary: "#78350f", accent: "#f59e0b", link: "#b45309" },
];

export const TONE_DEFAULT_COLOR: Record<BrandTone, string> = {
  professional: "#1e3a8a",
  friendly: "#0d9488",
  luxury: "#1c1917",
  bold: "#dc2626",
  minimal: "#0f172a",
};

/** Normalize an arbitrary string into a DNS-safe subdomain label (no dots). */
export function normalizeSubdomain(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Deterministic Target-Audience suggestions tailored to the business (NOT hardcoded to real estate).
 * Matches industry first, then the owner's description / services, against a curated keyword map.
 * Falls back to a sensible generic set. Pure — safe in client + server.
 */
interface AudiencePack { match: RegExp; audiences: string[] }
const AUDIENCE_PACKS: AudiencePack[] = [
  { match: /real\s?estate|realtor|broker(age)?|property|properties|homes?|listing|mortgage|mls/i,
    audiences: ["First-time home buyers", "Luxury buyers", "Sellers & downsizers", "Real-estate investors", "Renters", "Relocating families", "Local families", "Property developers"] },
  { match: /\bai\b|artificial intelligence|automation|machine learning|saas|software|tech\b|consult|agency|marketing|crm|no[- ]?code|workflow/i,
    audiences: ["Small business owners", "Agencies & consultants", "Coaches & course creators", "SaaS & startup founders", "Marketing teams", "Operations managers", "Solopreneurs & freelancers", "Local service businesses"] },
  { match: /dental|dentist|orthodont|medical|clinic|health|therap|chiro|physio|optometr|derma/i,
    audiences: ["New patients", "Families", "Busy professionals", "Seniors", "Parents of young children", "Cosmetic patients", "Insurance patients", "Referring providers"] },
  { match: /fitness|gym|personal train|yoga|pilates|crossfit|nutrition|wellness|coach.*health/i,
    audiences: ["Beginners", "Weight-loss clients", "Athletes & competitors", "Busy professionals", "Active seniors", "New parents", "Group-class members", "1:1 coaching clients"] },
  { match: /\blaw\b|legal|attorney|lawyer|litigation|paralegal|notary/i,
    audiences: ["Individuals & families", "Small businesses", "Accident & injury clients", "Estate-planning clients", "Startups & founders", "Employers", "Real-estate clients", "Immigration clients"] },
  { match: /restaurant|cafe|coffee|food|catering|bakery|\bbar\b|bistro|brewery|diner/i,
    audiences: ["Local diners", "Families", "Date-night couples", "Office & catering orders", "Private events", "Takeout & delivery", "Tourists & visitors", "Foodies"] },
  { match: /plumb|hvac|roofing|electric|contractor|landscap|cleaning|renovat|handyman|pest|home\s?services|construction/i,
    audiences: ["Homeowners", "Property managers", "Landlords", "Real-estate agents", "Commercial clients", "New-build clients", "Emergency-service customers", "Local businesses"] },
  { match: /salon|spa|beauty|hair|nails|skincare|barber|aesthetic|lash|makeup|cosmetolog/i,
    audiences: ["New clients", "Bridal & events", "Busy professionals", "Students", "Men's grooming", "Loyal regulars", "Gift-card buyers", "Self-care seekers"] },
  { match: /shop|store|e-?commerce|retail|boutique|product|apparel|clothing|jewel|merch/i,
    audiences: ["Online shoppers", "Gift buyers", "Repeat customers", "Deal seekers", "Premium buyers", "Wholesale & B2B", "Local pickup customers", "Subscribers"] },
  { match: /account|bookkeep|\btax\b|financ|advisor|insurance|wealth|invest/i,
    audiences: ["Small business owners", "Self-employed & freelancers", "Startups", "Individuals & families", "High-net-worth clients", "Retirees", "Real-estate investors", "Nonprofits"] },
  { match: /coach|course|education|tutor|training|school|academy|mentor|bootcamp/i,
    audiences: ["Beginners", "Career changers", "Students", "Professionals upskilling", "Entrepreneurs", "Parents", "Teams & organizations", "Lifelong learners"] },
];
const GENERIC_AUDIENCES = ["Small business owners", "Local customers", "Professionals", "Families", "Startups & founders", "Enterprise clients", "First-time customers", "Repeat clients"];

export function audienceSuggestionsFor(industry?: string, description?: string, services?: string): string[] {
  const ind = (industry ?? "").toLowerCase();
  const byIndustry = ind ? AUDIENCE_PACKS.find((p) => p.match.test(ind)) : undefined;
  if (byIndustry) return byIndustry.audiences;
  const full = `${ind} ${(description ?? "").toLowerCase()} ${(services ?? "").toLowerCase()}`.trim();
  const byFull = full ? AUDIENCE_PACKS.find((p) => p.match.test(full)) : undefined;
  return byFull ? byFull.audiences : GENERIC_AUDIENCES;
}

/** Suggest a few good subdomains from the business name (+ industry/city), DNS-safe and deduped. */
export function subdomainSuggestions(name: string, industry?: string, city?: string): string[] {
  const base = normalizeSubdomain(name || "");
  const out: string[] = [];
  const push = (s: string) => { const v = normalizeSubdomain(s); if (v.length >= 3 && !out.includes(v) && !RESERVED_SUBDOMAINS.has(v)) out.push(v); };
  if (base) push(base);
  const indWord = (industry || "").trim().split(/\s+/)[0] || "";
  if (base && indWord) push(`${base}-${indWord}`);
  const cityWord = (city || "").trim().split(/\s+/)[0] || "";
  if (base && cityWord) push(`${base}-${cityWord}`);
  if (base) push(`get-${base}`);
  if (base) push(`${base}-online`);
  return out.slice(0, 4);
}

export interface WizardPayload {
  businessName: string;
  industry: string;
  country: string;
  city?: string;
  audience?: string;
  services?: string;
  businessDescription?: string;   // a couple of sentences the owner provides up-front
  logoUrl?: string;               // logo (from existing site or pasted) — important for brand
  pages?: string[];               // the (editable) page titles to build, from the plan step
  importMode?: "rebuild" | "exact"; // how to copy an existing site: structured rebuild vs exact snapshot
  tone: BrandTone;
  // Brand palette (named roles) + typography overrides from the Design step.
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  linkColor?: string;
  fontHeading?: string;
  fontBody?: string;
  hasWebsite?: boolean;
  existingUrl?: string;
  existingBlog?: string;
  socialLinks?: string[];
  aiConsent: boolean;
  subdomain: string;
  templateFamily: TemplateFamily;
  primaryColor: string;        // hex, e.g. "#1e3a8a"
  makePublicNow?: boolean;     // reserved for PUBLISH; ignored at draft creation
}

export interface SubdomainCheck {
  available: boolean;
  reason?: "too-short" | "too-long" | "reserved" | "taken" | "invalid";
  normalized: string;
  host: string;
}

// Pre-populated country dropdown for the wizard (alphabetical, common set).
export const COUNTRIES = [
  "Canada", "United States", "United Kingdom", "Australia", "New Zealand", "Ireland",
  "Argentina", "Austria", "Bangladesh", "Belgium", "Brazil", "Bulgaria", "Chile", "China",
  "Colombia", "Croatia", "Czech Republic", "Denmark", "Egypt", "Estonia", "Finland", "France",
  "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Israel",
  "Italy", "Japan", "Kenya", "Kuwait", "Latvia", "Lithuania", "Luxembourg", "Malaysia", "Mexico",
  "Morocco", "Netherlands", "Nigeria", "Norway", "Pakistan", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Saudi Arabia", "Singapore", "Slovakia", "Slovenia", "South Africa",
  "South Korea", "Spain", "Sweden", "Switzerland", "Thailand", "Turkey", "Ukraine",
  "United Arab Emirates", "Vietnam",
] as const;

/** Match an AI-returned country string to a canonical COUNTRIES entry (case/alias-insensitive). */
export function normalizeCountry(raw?: string | null): string {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return "";
  const alias: Record<string, string> = {
    usa: "United States", us: "United States", "u.s.": "United States", "u.s.a.": "United States",
    america: "United States", uk: "United Kingdom", "u.k.": "United Kingdom", britain: "United Kingdom",
    england: "United Kingdom", uae: "United Arab Emirates", "korea": "South Korea", "south-korea": "South Korea",
  };
  if (alias[v]) return alias[v];
  const hit = COUNTRIES.find((c) => c.toLowerCase() === v);
  return hit ?? "";
}

/** Result of the upfront "analyze my presence" enrichment pass. */
export interface EnrichedProfile {
  found: boolean;
  businessName?: string;
  description?: string;           // AI's "what does this business do?" summary
  industry?: string;
  services?: string;
  audience?: string;
  socialLinks?: string[];         // social-profile URLs scraped from the existing site
  logoUrl?: string;               // best-effort logo from the existing site
  tone?: BrandTone;
  country?: string;
  city?: string;
  primaryColor?: string;          // hex extracted from the site
  templateFamily?: TemplateFamily;
  imageCount?: number;
  sourceUrl?: string;
  notes?: string;                 // human summary ("Found name, services, brand color…")
}

/** Deterministic proposed sitemap shown on the plan step (mirrors lib/sites/page-generate trees). */
export interface PlannedPage { title: string; kind: "core" | "seo" | "funnel" }
export function plannedPages(): PlannedPage[] {
  return [
    { title: "Home", kind: "core" }, { title: "About", kind: "core" }, { title: "Services", kind: "core" },
    { title: "Pricing", kind: "core" }, { title: "Testimonials", kind: "core" }, { title: "Contact", kind: "core" },
    { title: "Blog", kind: "seo" }, { title: "FAQ", kind: "seo" },
    { title: "Free Guide", kind: "funnel" }, { title: "Thank You", kind: "funnel" }, { title: "Get Started", kind: "funnel" },
  ];
}

export interface CreateWizardResult {
  ok: boolean;
  websiteId?: string;
  subdomain?: string;
  host?: string;
  pagesCreated?: number;
  aiUsed?: boolean;
  error?: string;
}
