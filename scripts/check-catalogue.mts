/**
 * Knowledge Catalogue passive-surface checks (Phase 1). Pure — no DB, no network.
 * Run from the project root:  npx tsx scripts/check-catalogue.mts
 * Exits non-zero on the first failure so it can gate a build/CI step.
 *
 * Covers: schema parsing + defaults, vertical-agnosticism, verification-freshness
 * gating, seed-SQL/fixture parity, llms.txt rendering, JSON-LD emission + back-compat,
 * agent card, and public-view redaction.
 */
import { readFileSync } from "node:fs";
import {
  parseCatalogue,
  safeParseCatalogue,
  isVerificationFresh,
  citeAs,
  toPublicView,
} from "@/lib/catalogue/schema";
import { aliRealtorCatalogue } from "@/lib/catalogue/fixtures/ali-realtor";
import { renderCatalogueSections } from "@/lib/catalogue/llms-txt";
import { buildAgentCard } from "@/lib/catalogue/agent-card";
import { buildJsonLd } from "@/lib/seo/structured-data";

let failures = 0;
function ok(cond: unknown, msg: string) {
  if (cond) console.log("ok  -", msg);
  else { console.error("FAIL-", msg); failures++; }
}
const findType = (g: any[], t: string) => g.find((n) => n["@type"] === t);
const NOW = new Date("2026-07-10T00:00:00Z");

// ---- schema ---------------------------------------------------------------
const ali = parseCatalogue(aliRealtorCatalogue);
ok(ali.identity.display_name === "Ali — ali.realtor", "realtor fixture parses");
ok(ali.schema_version === "1.0", "schema_version default");
ok(ali.services[0].price.currency === "CAD", "price currency default");
ok(isVerificationFresh(ali) === false, "ali unverified -> gated");
ok(citeAs(ali).startsWith("Ali"), "citeAs");

const plumber = parseCatalogue({
  vertical: "services",
  identity: { display_name: "Bob's Plumbing", nap: { phone: "+14165550101" } },
  services: [{ id: "drain", name: "Drain cleaning", price: { model: "hourly", amount: 120 } }],
});
ok(plumber.vertical === "services", "non-realtor vertical parses");
ok(plumber.credentials.is_licensed === false, "nested defaults applied (prefault)");

const verified = parseCatalogue({
  identity: { display_name: "V" },
  verification: { verified: true, verified_at: "2026-07-01T00:00:00Z", method: "manual", freshness_ttl_days: 30 },
});
ok(isVerificationFresh(verified, NOW) === true, "verified+fresh -> true");
ok(isVerificationFresh(verified, new Date("2026-09-01T00:00:00Z")) === false, "stale -> false");
ok(safeParseCatalogue({ identity: {} }).success === false, "missing display_name rejected");

// ---- seed SQL / fixture parity -------------------------------------------
const sql = readFileSync(new URL("../supabase/seed/ali-realtor-catalogue.sql", import.meta.url), "utf8");
const parts = sql.split("$catalogue$");
ok(parts.length === 3, "seed has exactly one dollar-quoted block");
const embedded = JSON.parse(parts[1].trim());
ok(JSON.stringify(parseCatalogue(embedded)) === JSON.stringify(ali), "seed JSON == fixture canonical");

// ---- llms.txt renderer ----------------------------------------------------
const txt = renderCatalogueSections(ali).join("\n");
ok(txt.includes("## Services") && txt.includes("Buyer representation (Commission-based · Greater Toronto Area)"), "llms services w/ price+area");
ok(txt.includes("First-time buyer consultation (Free"), "llms free label");
ok(!/License #:/.test(txt), "llms license hidden (unverified)");
ok(txt.includes("Verification pending"), "llms verification-pending note");
ok(!txt.includes("## Ratings"), "llms ratings hidden (unverified)");

const vtxt = renderCatalogueSections(parseCatalogue({
  ...aliRealtorCatalogue,
  verification: { verified: true, verified_at: "2026-07-05T00:00:00Z", method: "manual", freshness_ttl_days: 30 },
  credentials: { ...aliRealtorCatalogue.credentials, license_number: "RECO-123456" },
  reviews: { aggregate: { rating: 4.9, count: 87, source: "Google" }, samples: [] },
})).join("\n");
ok(vtxt.includes("License #: RECO-123456"), "llms license shown (verified)");
ok(vtxt.includes("4.9/5 from 87 reviews"), "llms ratings shown (verified)");

// ---- JSON-LD --------------------------------------------------------------
const ld: any = buildJsonLd({ url: "https://ali.realtor/", siteName: "Ali", title: "Home", catalogue: ali });
ok(ld["@context"] === "https://schema.org", "jsonld @context");
const biz = findType(ld["@graph"], "RealEstateAgent");
ok(!!biz, "jsonld RealEstateAgent node");
ok(biz.hasOfferCatalog.itemListElement.length === 3, "jsonld OfferCatalog x3");
ok(biz.hasCredential.identifier === undefined, "jsonld license id hidden (unverified)");
ok(biz.aggregateRating === undefined, "jsonld rating hidden (unverified)");
ok(findType(ld["@graph"], "FAQPage").mainEntity.length === 3, "jsonld FAQPage merged");
const base: any = buildJsonLd({ url: "https://x.test/", siteName: "X", title: "Home" });
ok(!!findType(base["@graph"], "Organization") && !findType(base["@graph"], "RealEstateAgent"), "jsonld back-compat (no catalogue)");

// ---- agent card + public view --------------------------------------------
const card1: any = buildAgentCard(ali, "https://ali.realtor", "tid");
ok(card1.skills.length === 3 && card1.url === undefined && !card1.securitySchemes && !card1.authentication, "agent card: only public read skills pre-Phase-2, no active url/securitySchemes");
const card2: any = buildAgentCard(ali, "https://ali.realtor", "tid", "https://w.example.dev");
ok(card2.mcp.endpoint === "https://w.example.dev/mcp/tid" && card2.skills.length === 5 && !!card2.securitySchemes, "agent card: mcp endpoint + all skills + securitySchemes when active");
ok((card2.skills.find((s: any) => s.id === "ask")?.security?.length ?? 0) > 0, "agent card: ask skill is OAuth-gated (not free-to-call)");
ok((card1.skills.find((s: any) => s.id === "get_profile")?.security?.length ?? 0) === 0, "agent card: read skills stay public");
const pub = toPublicView(parseCatalogue({
  ...aliRealtorCatalogue,
  credentials: { ...aliRealtorCatalogue.credentials, license_number: "HIDE" },
  reviews: { aggregate: { rating: 5, count: 3 }, samples: [] },
}));
ok(pub.credentials.license_number === undefined && pub.reviews.aggregate === undefined, "public view redacts regulated fields (unverified)");

// ---------------------------------------------------------------------------
if (failures) { console.error(`\n${failures} CHECK(S) FAILED`); process.exit(1); }
console.log("\nALL PASSIVE-SURFACE CHECKS PASSED");
