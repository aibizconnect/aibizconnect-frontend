import { z } from "zod";

/**
 * Knowledge Catalogue — the vertical-agnostic, machine-readable representation of a
 * business that AI agents both READ (to cite) and CALL (to query). One versioned
 * JSON document per tenant; a small required core + typed, optional sections so it
 * fits a realtor OR any SMB.
 *
 * `identity` + `credentials` are seeded from the professional-profile whitepaper
 * (business/brand-docs/Guideline for AI-Powered Profession.txt). Everything else is
 * additive and optional. This module is the single shared contract: the Next.js
 * passive routes (llms.txt, JSON-LD, .well-known) import it, and the Cloudflare
 * Worker copies it for the active A2A/MCP surface.
 *
 * Schema-light on purpose (mirrors tenant_ai_agents / migration 0053): the whole doc
 * lives in a `jsonb` column and is validated here, not by table columns.
 */

export const CATALOGUE_SCHEMA_VERSION = "1.0";

/** Verticals resolved from tenants.industry_key (migration 0077). */
export const VERTICALS = ["real_estate", "mortgage", "retail", "services", "platform"] as const;
export type Vertical = (typeof VERTICALS)[number];

const geo = z.object({ lat: z.number(), lng: z.number() }).partial();

const postalAddress = z
  .object({
    streetAddress: z.string(),
    locality: z.string(), // city
    region: z.string(), // province / state
    postalCode: z.string(),
    country: z.string(),
  })
  .partial();

const nap = z.object({
  phone: z.string().optional(),
  email: z.string().optional(), // permissive on purpose — display forms allowed
  address: postalAddress.optional(),
  geo: geo.optional(),
});

/**
 * Freshness + verification gate. Nothing licensed/regulated should be published or
 * cited while `verified` is false — the whole value proposition is TRUSTED data, and
 * a stale/wrong license number cited by an AI is a liability (see plan risks).
 */
const verification = z.object({
  verified: z.boolean().default(false),
  verified_at: z.string().optional(), // ISO date
  method: z.enum(["stripe_identity", "manual", "domain"]).optional(),
  verified_fields: z.array(z.string()).default([]),
  freshness_ttl_days: z.number().int().positive().default(30),
});

const identity = z.object({
  legal_name: z.string().optional(),
  display_name: z.string().min(1),
  professional_role: z.string().optional(), // whitepaper: professional_role
  domain_expertise: z.array(z.string()).default([]), // whitepaper: domain_expertise_list
  short_bio: z.string().optional(), // whitepaper: sequential_history.short_term_summary
  long_bio: z.string().optional(), // whitepaper: sequential_history.long_term_summary
  nap: nap.prefault({}),
  brand: z.object({ logo_url: z.string().optional(), site_url: z.string().optional() }).prefault({}),
  languages: z.array(z.string()).default(["en"]),
});

const certification = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  year: z.number().int().optional(),
});

// whitepaper: credential_and_licensing { is_licensed, states[], license_number }
const credentials = z.object({
  is_licensed: z.boolean().default(false),
  license_number: z.string().optional(),
  regulator: z.string().optional(),
  jurisdictions: z.array(z.string()).default([]),
  certifications: z.array(certification).default([]),
});

const metric = z.object({ kpi: z.string(), value: z.string() }); // whitepaper: performance_metrics[]

const price = z.object({
  model: z.enum(["commission", "fixed", "hourly", "quote", "free"]).default("quote"),
  amount: z.number().nullable().default(null),
  currency: z.string().default("CAD"),
  notes: z.string().optional(),
});

const service = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  area_ids: z.array(z.string()).default([]),
  price: price.prefault({}),
});

const serviceArea = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["city", "region", "neighbourhood", "country", "online"]).default("region"),
  geo: geo.optional(),
});

const faq = z.object({ q: z.string(), a: z.string() });
const policy = z.object({ topic: z.string(), text: z.string() });

const reviews = z.object({
  aggregate: z
    .object({ rating: z.number(), count: z.number().int(), source: z.string().optional() })
    .optional(),
  samples: z
    .array(z.object({ author: z.string().optional(), rating: z.number().optional(), text: z.string() }))
    .default([]),
});

// Real customer question/answer corpus — the retrieval source for the `ask` tool.
const qa = z.object({ q: z.string(), a: z.string(), source_url: z.string().optional() });

const citations = z.object({
  canonical_url: z.string().optional(),
  cite_as: z.string().optional(),
  source_pages: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
});

export const catalogueSchema = z.object({
  schema_version: z.string().default(CATALOGUE_SCHEMA_VERSION),
  catalogue_id: z.string().optional(),
  tenant_id: z.string().optional(),
  vertical: z.enum(VERTICALS).default("services"),
  updated_at: z.string().optional(),
  verification: verification.prefault({}),
  identity,
  credentials: credentials.prefault({}),
  performance_metrics: z.array(metric).default([]),
  services: z.array(service).default([]),
  service_areas: z.array(serviceArea).default([]),
  faqs: z.array(faq).default([]),
  policies: z.array(policy).default([]),
  reviews: reviews.prefault({}),
  qa: z.array(qa).default([]),
  citations: citations.prefault({}),
  // Weekly-refreshed dynamic content (kept in sync with the Worker's a2a/render.ts Catalogue).
  recent_posts: z.array(z.object({ title: z.string().optional(), url: z.string(), date: z.string().optional() })).default([]),
  listings: z.array(z.object({ title: z.string().optional(), url: z.string(), price: z.string().optional(), location: z.string().optional() })).default([]),
  tools: z.array(z.object({ name: z.string(), url: z.string(), description: z.string().optional() })).default([]),
});

export type Catalogue = z.infer<typeof catalogueSchema>;
/** Pre-defaults shape — what an author/fixture supplies before `parseCatalogue` fills defaults. */
export type CatalogueInput = z.input<typeof catalogueSchema>;
export type CatalogueIdentity = z.infer<typeof identity>;
export type CatalogueService = z.infer<typeof service>;
export type CatalogueServiceArea = z.infer<typeof serviceArea>;
export type CatalogueCredentials = z.infer<typeof credentials>;
export type CatalogueVerification = z.infer<typeof verification>;

/** Strict parse — throws on invalid input. Use when writing/publishing a catalogue. */
export function parseCatalogue(input: unknown): Catalogue {
  return catalogueSchema.parse(input);
}

/** Non-throwing parse — use on read paths so a bad row degrades instead of 500-ing. */
export function safeParseCatalogue(input: unknown) {
  return catalogueSchema.safeParse(input);
}

/**
 * Are the VERIFIED/regulated fields (license number, credential badge, aggregate
 * ratings) safe to assert right now? True only when the doc is verified AND still
 * inside its freshness window. Editorial "is this catalogue live at all" is a
 * separate decision stored on the DB row (`status = 'published'`); this gate governs
 * only the regulated claims, so non-regulated info (services, areas, FAQs, contact)
 * can publish while a license number is still being verified. `now` is injectable so
 * the same check runs in tests and in the edge Worker.
 */
export function isVerificationFresh(doc: Catalogue, now: Date = new Date()): boolean {
  if (!doc.verification?.verified) return false;
  const verifiedAt = doc.verification.verified_at ? new Date(doc.verification.verified_at) : null;
  if (!verifiedAt || Number.isNaN(verifiedAt.getTime())) return false;
  const ttlMs = (doc.verification.freshness_ttl_days ?? 30) * 24 * 60 * 60 * 1000;
  return now.getTime() - verifiedAt.getTime() <= ttlMs;
}

/** Preferred citation label for AI engines, with a sensible fallback. */
export function citeAs(doc: Catalogue): string {
  return doc.citations?.cite_as || doc.identity?.display_name || "This business";
}

/**
 * Public-safe view of a catalogue: when verification is NOT fresh, redact the regulated
 * fields we must never assert unverified (license number, aggregate ratings). Used by the
 * public JSON surfaces (.well-known/catalogue.json, agent card) so redaction is consistent
 * with the llms.txt renderer and JSON-LD builder. Non-regulated info is unchanged.
 */
export function toPublicView(doc: Catalogue, now: Date = new Date()): Catalogue {
  if (isVerificationFresh(doc, now)) return doc;
  return {
    ...doc,
    credentials: { ...doc.credentials, license_number: undefined },
    reviews: { ...doc.reviews, aggregate: undefined },
  };
}
