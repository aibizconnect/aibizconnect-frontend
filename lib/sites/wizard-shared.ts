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

export interface WizardPayload {
  businessName: string;
  industry: string;
  country: string;
  city?: string;
  audience?: string;
  services?: string;
  tone: BrandTone;
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
  industry?: string;
  services?: string;
  audience?: string;
  tone?: BrandTone;
  country?: string;
  city?: string;
  primaryColor?: string;          // hex extracted from the site
  templateFamily?: TemplateFamily;
  imageCount?: number;
  sourceUrl?: string;
  notes?: string;                 // human summary ("Found name, services, brand color…")
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
