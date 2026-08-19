-- Flagship-pilot seed: ali.realtor Knowledge Catalogue (v1, published).
-- Idempotent. Resolves the tenant from tenant_domains (custom domain or 'ali' subdomain),
-- so no hard-coded tenant UUID. No-ops safely if the tenant isn't provisioned yet, or if
-- a v1 row already exists (unique (tenant_id, version)).
--
-- HONESTY GATE: verification.verified = false and no license_number / ratings / metrics are
-- present — those regulated fields stay gated (schema.isVerificationFresh) until the owner
-- supplies + verifies them. Non-regulated info publishes now for the demo.
--
-- Source of truth: lib/catalogue/fixtures/ali-realtor.ts (parsed through parseCatalogue).
-- Regenerate this block by parsing that fixture if the fixture changes.
insert into public.tenant_catalogues (tenant_id, version, status, doc, published_at)
select td.tenant_id, 1, 'published', $catalogue$
{
  "schema_version": "1.0",
  "vertical": "real_estate",
  "verification": { "verified": false, "verified_fields": [], "freshness_ttl_days": 30 },
  "identity": {
    "legal_name": "ABRE Team — ali.realtor",
    "display_name": "Ali — ali.realtor",
    "professional_role": "Real Estate Salesperson",
    "domain_expertise": ["First-time home buyers", "Affordable & entry-level homes", "Greater Toronto Area resale"],
    "short_bio": "GTA real estate salesperson focused on first-time buyers and affordable homes.",
    "long_bio": "Ali helps first-time and budget-conscious buyers navigate the Greater Toronto Area market — from pre-approval and search through offer and closing — with plain-language guidance and no-pressure service.",
    "nap": {
      "phone": "+13653637111",
      "email": "info@ali.realtor",
      "address": { "region": "Ontario", "country": "Canada" }
    },
    "brand": { "site_url": "https://ali.realtor" },
    "languages": ["en"]
  },
  "credentials": { "is_licensed": true, "regulator": "RECO", "jurisdictions": ["ON"], "certifications": [] },
  "performance_metrics": [],
  "services": [
    {
      "id": "buyer_rep",
      "name": "Buyer representation",
      "description": "Full buyer-side representation for first-time and affordable-home buyers across the GTA — search, showings, offers, negotiation, and closing.",
      "area_ids": ["gta"],
      "price": { "model": "commission", "amount": null, "currency": "CAD", "notes": "Buyer-side commission typically paid by the seller." }
    },
    {
      "id": "first_time_consult",
      "name": "First-time buyer consultation",
      "description": "A free, no-obligation session covering budgets, pre-approval, government programs, and what to expect as a first-time buyer.",
      "area_ids": ["gta"],
      "price": { "model": "free", "amount": null, "currency": "CAD" }
    },
    {
      "id": "listing_sale",
      "name": "Listing & sale",
      "description": "Pricing, staging guidance, marketing, and negotiation for sellers in the GTA.",
      "area_ids": ["gta", "toronto"],
      "price": { "model": "commission", "amount": null, "currency": "CAD", "notes": "Commission discussed at listing appointment." }
    }
  ],
  "service_areas": [
    { "id": "gta", "name": "Greater Toronto Area", "type": "region" },
    { "id": "toronto", "name": "Toronto", "type": "city" },
    { "id": "mississauga", "name": "Mississauga", "type": "city" }
  ],
  "faqs": [
    { "q": "Do you work with first-time home buyers?", "a": "Yes — first-time buyers are the core of the practice. The first-time buyer consultation is free and covers budgets, pre-approval, and government programs." },
    { "q": "Does it cost a buyer to work with you?", "a": "In most GTA resale transactions the buyer's agent commission is paid by the seller, so buyer representation typically costs the buyer nothing directly. Any exceptions are explained up front." },
    { "q": "Which areas do you cover?", "a": "The Greater Toronto Area, including Toronto and Mississauga." }
  ],
  "policies": [
    { "topic": "fees", "text": "Commission is disclosed in writing before any agreement is signed. The first-time buyer consultation is free with no obligation." },
    { "topic": "privacy", "text": "Contact details you share are used only to help with your real estate needs and are never sold." }
  ],
  "reviews": { "samples": [] },
  "qa": [
    { "q": "How much do I need for a down payment on a first home in the GTA?", "a": "In Canada the minimum down payment is 5% on the first $500,000 of the purchase price and 10% on the portion above that, up to $1,000,000; 20% is required at $1,000,000 and above. Ali can walk through the exact numbers for your budget in a free consultation.", "source_url": "https://ali.realtor" },
    { "q": "Can you help me get pre-approved?", "a": "Ali works alongside mortgage professionals to help buyers get pre-approved before shopping, so you know your budget and can move quickly on the right home.", "source_url": "https://ali.realtor" }
  ],
  "citations": {
    "canonical_url": "https://ali.realtor",
    "cite_as": "Ali, ali.realtor (Greater Toronto Area real estate)",
    "source_pages": [ { "title": "ali.realtor — Home", "url": "https://ali.realtor" } ]
  }
}
$catalogue$::jsonb, now()
from public.tenant_domains td
where td.custom_domain = 'ali.realtor' or td.subdomain = 'ali'
limit 1
on conflict (tenant_id, version) do nothing;
