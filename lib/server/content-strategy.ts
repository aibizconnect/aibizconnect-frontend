import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Server-only DETERMINISTIC content-strategy generator (architect D-076/RULING 76). NO live LLM call:
 * a strategy is derived from the tenant's Business Profile (niche, name, city) using a curated
 * industry→topic knowledge map. Zero hallucination, always works, fully reproducible.
 *
 * HARD RULE (CS-V13): never fabricate competitor names, client names, awards, testimonials, or
 * pricing. Output is templated topic/keyword guidance only — the kind of thing a strategist would
 * tell you to write, not invented facts.
 */

export type Intent = "informational" | "commercial" | "transactional" | "navigational";
export type Priority = "quick_win" | "big_bet" | "fill_in";

export interface ArticleIdea { title: string; intent: Intent; est_words: number }
export interface Cluster { title: string; articles: ArticleIdea[] }
export interface Pillar { title: string; cluster: Cluster[] }
export interface QueueItem { title: string; keyword: string; intent: Intent; priority: Priority; est_words: number }
export interface CalendarWeek { week: number; items: { title: string; status: string }[] }

export interface ContentStrategy {
  niche: string;
  profile_snapshot: Record<string, unknown>;
  pillars: Pillar[];
  queue: QueueItem[];
  calendar: CalendarWeek[];
  status: string;
}

// ── Word-count budgets by content depth (CS-V11: positive ints ≥ 100). ──────────
const WORDS = { pillar: 2600, cluster: 1500, support: 950 } as const;

function slugKeyword(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// ── Industry knowledge map ──────────────────────────────────────────────────────
// Each category defines pillar topics; clusters + articles are generated from
// parameterised patterns so copy stays niche-relevant without inventing facts.
interface CategoryPack { key: string; label: string; match: RegExp; pillars: { title: string; clusters: string[] }[] }

const CATEGORIES: CategoryPack[] = [
  {
    key: "real_estate", label: "real estate", match: /real\s?estate|realtor|broker|property|homes?|listing|mortgage/i,
    pillars: [
      { title: "Buying a Home", clusters: ["First-time buyers", "Mortgages & financing", "Closing the deal"] },
      { title: "Selling a Home", clusters: ["Pricing your home", "Staging & prep", "Marketing your listing"] },
      { title: "Local Market & Neighborhoods", clusters: ["Neighborhood guides", "Market trends", "Schools & amenities"] },
    ],
  },
  {
    key: "dental", label: "dental care", match: /dental|dentist|orthodont|teeth|smile|invisalign/i,
    pillars: [
      { title: "Preventive Care", clusters: ["Cleanings & checkups", "At-home care", "Kids' dental health"] },
      { title: "Cosmetic Dentistry", clusters: ["Whitening", "Veneers", "Smile makeovers"] },
      { title: "Restorative & Treatments", clusters: ["Implants", "Root canals", "Emergency dental"] },
    ],
  },
  {
    key: "fitness", label: "fitness & wellness", match: /fitness|gym|personal train|yoga|pilates|crossfit|nutrition|wellness/i,
    pillars: [
      { title: "Getting Started", clusters: ["Beginner workouts", "Setting goals", "Choosing a program"] },
      { title: "Training & Technique", clusters: ["Strength training", "Cardio & conditioning", "Recovery & mobility"] },
      { title: "Nutrition & Lifestyle", clusters: ["Meal planning", "Supplements", "Habits & motivation"] },
    ],
  },
  {
    key: "legal", label: "legal services", match: /law|legal|attorney|lawyer|firm|litigation/i,
    pillars: [
      { title: "Know Your Rights", clusters: ["Common legal questions", "When to hire a lawyer", "What to expect"] },
      { title: "Practice Areas", clusters: ["Process explained", "Costs & timelines", "Case studies (anonymized)"] },
      { title: "Working With Us", clusters: ["Consultations", "Documents you'll need", "FAQs"] },
    ],
  },
  {
    key: "restaurant", label: "restaurant & food", match: /restaurant|cafe|coffee|food|catering|bakery|bar|bistro/i,
    pillars: [
      { title: "Our Menu & Cuisine", clusters: ["Signature dishes", "Dietary options", "Seasonal specials"] },
      { title: "Dining Experience", clusters: ["Reservations", "Private events", "Takeout & delivery"] },
      { title: "Food Culture", clusters: ["Recipes & tips", "Sourcing & ingredients", "Behind the scenes"] },
    ],
  },
  {
    key: "home_services", label: "home services", match: /plumb|hvac|roofing|electric|contractor|landscap|cleaning|renovat|handyman|pest/i,
    pillars: [
      { title: "Common Problems & Fixes", clusters: ["Troubleshooting", "When to call a pro", "Cost guides"] },
      { title: "Maintenance & Prevention", clusters: ["Seasonal checklists", "DIY tips", "Avoiding emergencies"] },
      { title: "Hiring & Projects", clusters: ["Choosing a contractor", "What to expect", "Service areas"] },
    ],
  },
  {
    key: "beauty", label: "beauty & salon", match: /salon|spa|beauty|hair|nails|skincare|barber|aesthetic|lash/i,
    pillars: [
      { title: "Services & Treatments", clusters: ["What to expect", "Aftercare", "Trends & styles"] },
      { title: "At-Home Care", clusters: ["Routines", "Product guides", "Common mistakes"] },
      { title: "Booking & Experience", clusters: ["First visit", "Pricing & packages", "Gift cards & events"] },
    ],
  },
  {
    key: "ecommerce", label: "e-commerce & retail", match: /shop|store|ecommerce|retail|boutique|product|brand/i,
    pillars: [
      { title: "Product Guides", clusters: ["How to choose", "Comparisons", "Care & usage"] },
      { title: "Buying Confidently", clusters: ["Reviews & quality", "Shipping & returns", "Sizing & fit"] },
      { title: "Brand & Lifestyle", clusters: ["Behind the brand", "Customer stories", "Trends"] },
    ],
  },
];

const GENERIC: CategoryPack["pillars"] = [
  { title: "Getting Started", clusters: ["Beginner's guide", "Common questions", "How to choose"] },
  { title: "Services & Solutions", clusters: ["What we offer", "Process explained", "Pricing & value"] },
  { title: "Tips & Resources", clusters: ["Best practices", "Mistakes to avoid", "Industry trends"] },
];

function categoryFor(niche: string): CategoryPack | null {
  return CATEGORIES.find((c) => c.match.test(niche)) ?? null;
}

// Article patterns per cluster slot, each with a fixed intent (CS-V10) and depth.
function articlesFor(cluster: string, label: string, city: string): ArticleIdea[] {
  const loc = city ? ` in ${city}` : "";
  return [
    { title: `The Complete Guide to ${cluster}`, intent: "informational", est_words: WORDS.cluster },
    { title: `${cluster}: Everything You Need to Know`, intent: "informational", est_words: WORDS.support },
    { title: `Best ${label} for ${cluster}${loc}`, intent: "commercial", est_words: WORDS.support },
  ];
}

function buildPillars(niche: string, label: string, city: string): Pillar[] {
  const pack = categoryFor(niche);
  const defs = pack ? pack.pillars : GENERIC;
  const usedLabel = pack ? pack.label : (label || "services");
  return defs.map((p) => ({
    title: p.title,
    cluster: p.clusters.map((cl) => ({ title: cl, articles: articlesFor(cl, usedLabel, city) })),
  }));
}

// Local + comparison + conversion pages that every business benefits from.
function localAndConversion(label: string, city: string, business: string): ArticleIdea[] {
  const loc = city ? ` in ${city}` : "";
  const out: ArticleIdea[] = [
    { title: `Best ${label}${loc}: How to Choose`, intent: "commercial", est_words: WORDS.cluster },
    { title: `How Much Does ${label} Cost?${loc ? ` A ${city} Price Guide` : ""}`, intent: "commercial", est_words: WORDS.support },
    { title: `${label} FAQ: Your Questions Answered`, intent: "informational", est_words: WORDS.support },
    { title: `Why Work With ${business || "Us"}`, intent: "navigational", est_words: WORDS.support },
    { title: `Book a Consultation${loc}`, intent: "transactional", est_words: 700 < WORDS.support ? WORDS.support : 700 },
  ];
  return out;
}

function priorityFor(intent: Intent): Priority {
  if (intent === "commercial") return "quick_win";   // high buyer-intent, lower competition long-tail
  if (intent === "transactional") return "big_bet";  // converts, but competitive head terms
  return "fill_in";                                   // informational / navigational
}

/** Build the full deterministic strategy object from inputs (no DB, no LLM). */
export function buildStrategy(input: { niche: string; business: string; city: string; country?: string }): ContentStrategy {
  const niche = (input.niche || "").trim() || "general business";
  const pack = categoryFor(niche);
  const label = pack ? pack.label : niche.toLowerCase();
  const city = (input.city || "").trim();

  const pillars = buildPillars(niche, label, city);

  // Flatten all article ideas + the local/conversion set into a prioritized queue.
  const flat: ArticleIdea[] = [
    ...pillars.flatMap((p) => p.cluster.flatMap((c) => c.articles)),
    ...localAndConversion(label, city, input.business),
  ];
  // De-dupe by title, keep order.
  const seen = new Set<string>();
  const queue: QueueItem[] = [];
  for (const a of flat) {
    const key = a.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push({ title: a.title, keyword: slugKeyword(a.title), intent: a.intent, priority: priorityFor(a.intent), est_words: a.est_words });
  }

  // 12-week calendar: front-load quick wins, interleave big bets, fill with the rest. ~2 items/week.
  const order: Priority[] = ["quick_win", "big_bet", "fill_in"];
  const sorted = [...queue].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
  const calendar: CalendarWeek[] = Array.from({ length: 12 }, (_, i) => ({ week: i + 1, items: [] as { title: string; status: string }[] }));
  sorted.forEach((item, idx) => {
    const week = idx % 12;
    calendar[week].items.push({ title: item.title, status: "planned" });
  });

  return {
    niche,
    profile_snapshot: { business: input.business || null, city: city || null, country: input.country || null, category: pack?.key ?? "generic" },
    pillars,
    queue,
    calendar,
    status: "active",
  };
}

// ── Persistence + generation ─────────────────────────────────────────────────────

/** Resolve the tenant's niche + identity from Business Profile (tenant_settings), with fallbacks. */
async function resolveProfile(tenantId: string): Promise<{ niche: string; business: string; city: string; country: string }> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_settings")
    .select("setting_key, setting_value")
    .eq("tenant_id", tenantId)
    .in("setting_key", ["business_niche", "business_name", "address_city", "address_country"]);
  const m = new Map((data ?? []).map((r: any) => [r.setting_key, r.setting_value ? String(r.setting_value) : ""]));
  let niche = m.get("business_niche") || "";
  // Fallback to website analysis industry, if present.
  if (!niche) {
    try {
      const { data: a } = await supabase.from("website_analysis_results").select("industry").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if ((a as any)?.industry) niche = String((a as any).industry);
    } catch { /* table may not exist in all envs */ }
  }
  return { niche: niche || "general business", business: m.get("business_name") || "", city: m.get("address_city") || "", country: m.get("address_country") || "" };
}

export interface StrategyRecord extends ContentStrategy { updated_at?: string }

export async function getStrategyRecord(tenantId: string): Promise<StrategyRecord | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_content_strategy").select("*").eq("tenant_id", tenantId).maybeSingle();
  if (!data) return null;
  return {
    niche: data.niche, profile_snapshot: data.profile_snapshot ?? {}, pillars: data.pillars ?? [],
    queue: data.queue ?? [], calendar: data.calendar ?? [], status: data.status, updated_at: data.updated_at,
  };
}

/**
 * SERVER-ONLY gate-free core: generate + UPSERT the tenant's content strategy (CS-V16). Callers gate
 * access. Deterministic; records a metering event (CS-V19) + audit best-effort.
 */
export async function generateStrategyCore(tenantId: string, actor: string): Promise<{ ok: boolean; message?: string; strategy?: ContentStrategy }> {
  try {
    const profile = await resolveProfile(tenantId);
    const strategy = buildStrategy(profile);
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_content_strategy").upsert(
      {
        tenant_id: tenantId, niche: strategy.niche, profile_snapshot: strategy.profile_snapshot,
        pillars: strategy.pillars, queue: strategy.queue, calendar: strategy.calendar,
        status: "active", updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) return { ok: false, message: error.message };

    // Metering (CS-V19) — deterministic, but tracked for telemetry. Best-effort.
    try {
      const { recordAiUsage } = await import("@/app/tenants/[tenantId]/website/actions");
      await recordAiUsage(tenantId, "content_strategy_generation", 1, { deterministic: true });
    } catch { /* best effort */ }
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "content_strategy.generate", actorEmail: actor, meta: { tenantId, niche: strategy.niche } });
    } catch { /* best effort */ }

    return { ok: true, strategy };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Could not generate strategy." };
  }
}
