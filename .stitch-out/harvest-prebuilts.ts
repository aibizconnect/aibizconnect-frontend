// D-278: HARVEST the best sections from the 47 pages we built/imported into prebuilt
// templates (Ali: "disassemble every page... save for future use as prebuilt sections,
// then delete all"). Each pick: deep-clone → internal links to "#" → images re-ingested
// into the SYSTEM media library (they must outlive the website deletion) → schema-
// validated → emitted as lib/sections/harvested-prebuilts.ts.
import { writeFileSync } from "fs";
import { createSupabaseServiceClient } from "../lib/supabase/service";
import { sectionSchema } from "../lib/sections/schemas";
import { ingestExternalImage } from "../lib/media/ingest";
import { SYSTEM_TENANT_ID } from "../lib/media/system";

const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const ABC = "e53089f3-b078-4ef9-8e04-aba951ef520f";       // 18-page polished import
const OTTAWA_AUTO = "fb5ba781-f4d4-4e59-bc5e-52c050886d98"; // Stitch-designed demo

interface Pick {
  id: string; name: string; category: string; icon: string; blurb: string;
  websiteId: string; slug: string;
  /** select the top-level section: by exact _name, else by index */
  byName?: string; byIndex?: number;
}
const PICKS: Pick[] = [
  { id: "hv-saas-header", name: "SaaS header — dropdown nav", category: "Headers", icon: "🧭", blurb: "Logo + dropdown menus + CTA, white bar.", websiteId: ABC, slug: "home", byName: "Header" },
  { id: "hv-saas-hero", name: "SaaS hero — split", category: "Hero", icon: "🚀", blurb: "Bold headline, sub, dual CTAs beside product copy.", websiteId: ABC, slug: "home", byIndex: 1 },
  { id: "hv-audience-cards", name: "Audience cards", category: "About & Services", icon: "👥", blurb: "\"Who it's for\" persona card grid.", websiteId: ABC, slug: "home", byName: "Who it's for" },
  { id: "hv-why-band", name: "Why-us feature band", category: "About & Services", icon: "✨", blurb: "Tinted band with three reason cards.", websiteId: ABC, slug: "home", byName: "Why AIBizConnect" },
  { id: "hv-testimonial-wall", name: "Testimonial wall", category: "Social Proof", icon: "💬", blurb: "Quote cards with names, star ratings.", websiteId: ABC, slug: "home", byName: "Loved by pros" },
  { id: "hv-steps-watermark", name: "3 steps — watermark numerals", category: "Content", icon: "🪜", blurb: "Process steps with giant faint 01/02/03.", websiteId: ABC, slug: "home", byName: "How it works" },
  { id: "hv-gradient-cta", name: "Gradient CTA band", category: "Conversion", icon: "🌈", blurb: "Full-width blue→cyan gradient call-to-action.", websiteId: ABC, slug: "home", byName: "Ready to run your business in one OS?" },
  { id: "hv-footer-4col", name: "4-column footer + legal bar", category: "Footers", icon: "🦶", blurb: "Tagline + 3 link columns, © and legal links.", websiteId: ABC, slug: "home", byIndex: 9 },
  { id: "hv-pricing-badge", name: "Pricing cards with badge", category: "Conversion", icon: "💳", blurb: "Three plans, highlighted \"Most Popular\".", websiteId: ABC, slug: "pricing", byName: "Cards" },
  { id: "hv-checklist-band", name: "What-you-get checklist", category: "Content", icon: "✅", blurb: "Benefit checklist band from the solutions pages.", websiteId: ABC, slug: "solutions-real-estate", byName: "What you get" },
  { id: "hv-capabilities-grid", name: "Capabilities grid", category: "Content", icon: "🧩", blurb: "Feature capability cards (product page).", websiteId: ABC, slug: "product-crm", byName: "Capabilities" },
  { id: "hv-success-stories", name: "Client success stories", category: "Social Proof", icon: "⭐", blurb: "Navy testimonial trio (Stitch design).", websiteId: OTTAWA_AUTO, slug: "ottawa-mortgage-auto-home", byName: "Client Success Stories" },
  { id: "hv-steps-navy", name: "Process steps — navy", category: "Content", icon: "🛤️", blurb: "\"How we get you moving\" 3-step band (Stitch design).", websiteId: OTTAWA_AUTO, slug: "ottawa-mortgage-auto-home", byName: "How We Get You Moving" },
  { id: "hv-mortgage-hero", name: "Local-expert hero", category: "Hero", icon: "🏠", blurb: "Stitch-designed hero with photo + trust copy.", websiteId: OTTAWA_AUTO, slug: "ottawa-mortgage-auto-home", byIndex: 1 },
];

const IMG_RE = /^https?:\/\/[^"' ]+\.(?:jpe?g|png|webp|avif|gif)(?:\?[^"' ]*)?$/i;
const urlMap = new Map<string, string>();
async function rescueImage(url: string, tplId: string): Promise<string> {
  if (urlMap.has(url)) return urlMap.get(url)!;
  try {
    const ing = await ingestExternalImage(SYSTEM_TENANT_ID, url, { sourceType: "stock_image", tags: ["prebuilt", tplId] });
    const out = ing?.url ?? url;
    urlMap.set(url, out);
    return out;
  } catch { return url; }
}

async function genericize(node: unknown, tplId: string): Promise<unknown> {
  if (Array.isArray(node)) { const out = []; for (const x of node) out.push(await genericize(x, tplId)); return out; }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "_anchor" || k === "_uid") continue; // page-specific
      if (typeof v === "string") {
        if ((k === "href" || k === "url") && v.startsWith("/")) { out[k] = "#"; continue; }
        if (IMG_RE.test(v)) { out[k] = await rescueImage(v, tplId); continue; }
      }
      out[k] = await genericize(v, tplId);
    }
    return out;
  }
  return node;
}

(async () => {
  const sb = createSupabaseServiceClient();
  const harvested: Record<string, unknown>[] = [];
  for (const p of PICKS) {
    const { data: page } = await sb.from("website_pages").select("draft_sections").eq("tenant_id", P).eq("website_id", p.websiteId).eq("slug", p.slug).maybeSingle();
    const secs = ((page as any)?.draft_sections ?? []) as any[];
    let sec = p.byName ? secs.find((s) => s._name === p.byName) : undefined;
    if (!sec && p.byIndex != null) sec = secs[p.byIndex];
    if (!sec) { console.log(`SKIP ${p.id}: section not found (${p.byName ?? `idx ${p.byIndex}`})`); continue; }
    const clean = await genericize(JSON.parse(JSON.stringify(sec)), p.id);
    const valid = sectionSchema.safeParse(clean);
    if (!valid.success) { console.log(`SKIP ${p.id}: schema invalid — ${valid.error.issues[0]?.message}`); continue; }
    harvested.push({ id: p.id, name: p.name, category: p.category, icon: p.icon, blurb: p.blurb, sections: [clean] });
    console.log(`OK   ${p.id} (${p.name}) — images rescued so far: ${urlMap.size}`);
  }

  const file = `import type { PrebuiltTemplate } from "./prebuilt-templates";

/**
 * HARVESTED prebuilt sections (D-278, 2026-06-12) — the best bands rescued from the
 * first generation of built/imported sites (ABC SalesMaster import + Stitch Ottawa
 * demos) before Ali's clean-slate deletion. Images live in the SYSTEM media library
 * (tag "prebuilt"); internal links are genericized to "#". Generated by
 * .stitch-out/harvest-prebuilts.ts — regenerate, don't hand-edit section JSON.
 */
export const HARVESTED_PREBUILTS: PrebuiltTemplate[] = ${JSON.stringify(harvested, null, 2)} as unknown as PrebuiltTemplate[];
`;
  writeFileSync("lib/sections/harvested-prebuilts.ts", file);
  console.log(`\nwrote lib/sections/harvested-prebuilts.ts — ${harvested.length}/${PICKS.length} templates, ${urlMap.size} images rescued to SYSTEM library`);
})();
