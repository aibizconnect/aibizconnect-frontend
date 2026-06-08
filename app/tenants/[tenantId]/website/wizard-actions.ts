"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createPage, saveDraft, setWebsiteChrome } from "./actions";
import { llm, stripFences } from "@/lib/agent/llm";
import { generatedSectionsFor, extractPageContent, contentToBlocks } from "@/lib/sites/page-generate";
import { htmlToSections } from "@/lib/sites/html-importer";
import { importChrome, type ImportedChrome } from "@/lib/sites/chrome-importer";
import { extractTheme, type ExtractedTheme } from "@/lib/sites/theme-importer";
import { extractSeo } from "@/lib/sites/seo-importer";
import { fetchPage, discoverSitemapUrls, pickUrlForType, buildExactCopyIframe } from "@/lib/sites/site-clone";
import { researchCompetitors } from "@/lib/sites/competitor-research";
import {
  BRAND_TONES, FAMILY_THEME, RESERVED_SUBDOMAINS, SUBDOMAIN_BASE, TONE_DEFAULT_COLOR,
  normalizeSubdomain, normalizeCountry, audienceSuggestionsFor,
  type BrandTone, type TemplateFamily, type WizardPayload, type SubdomainCheck, type CreateWizardResult, type EnrichedProfile,
} from "@/lib/sites/wizard-shared";

/**
 * Onboarding WIZARD actions (Copilot ruling, Option A — websiteId-scoped throughout).
 *
 * DRAFT-ONLY. Nothing here publishes, charges, or registers DNS. The wizard:
 *   1. reserves a globally-unique `subdomain` on the websites row (status='draft'),
 *   2. creates the per-(tenant, website) brand row so theme reads are exact (no merge),
 *   3. scaffolds a Home page (header/footer globals + hero) via createPage,
 *   4. returns the websiteId so the caller can open the editor.
 *
 * Cloudflare CNAME is created later, on PUBLISH (production only) — NOT here.
 */

/** Backend availability check for the wizard's "Check availability" button. */
export async function checkSubdomain(raw: string): Promise<SubdomainCheck> {
  const normalized = normalizeSubdomain(raw);
  const host = `${normalized}.${SUBDOMAIN_BASE}`;
  if (normalized.length < 3) return { available: false, reason: "too-short", normalized, host };
  if (normalized.length > 40) return { available: false, reason: "too-long", normalized, host };
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(normalized))
    return { available: false, reason: "invalid", normalized, host };
  if (RESERVED_SUBDOMAINS.has(normalized)) return { available: false, reason: "reserved", normalized, host };

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("websites")
    .select("id")
    .ilike("subdomain", normalized)
    .limit(1);
  if (error) {
    // Column may not exist until 0026 is applied — treat as available so the wizard
    // still works pre-migration (reservation just won't persist the subdomain).
    return { available: true, normalized, host };
  }
  if (data && data.length > 0) return { available: false, reason: "taken", normalized, host };
  return { available: true, normalized, host };
}

/**
 * Ask the configured model to extract a business profile as JSON. Tries Gemini first
 * (GEMINI_API_KEY — what this env actually has), then the OpenAI provider, else null.
 */
async function aiExtractProfile(pageText: string, tenantId: string): Promise<any | null> {
  const system =
    "You analyze a business's website text and return ONLY a compact JSON object. " +
    "Keys: description (1-2 plain sentences answering 'what does this business do?'), " +
    "industry (short string), services (one sentence), audience (short string), " +
    "tone (one of: professional, friendly, luxury, bold, minimal), " +
    "country (full country name, e.g. Canada), city (city name only). " +
    "Use null for any field you cannot determine. No prose, no markdown.";
  const user = pageText.slice(0, 3000);

  // Gemini (direct) — JSON-forced.
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.AI_PLAN_MODEL || "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const j = await res.json();
        const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
        if (text) return JSON.parse(stripFences(text));
      }
    } catch { /* fall through to OpenAI */ }
  }
  // OpenAI provider (BYOK) fallback.
  const out = await llm.complete({ system, user, jsonObject: true, temperature: 0.2 }, tenantId);
  if (out) { try { return JSON.parse(stripFences(out)); } catch { /* ignore */ } }
  return null;
}

const ALLOWED_SECTION_TYPES = new Set(["hero", "features", "text", "heading", "bullet-list", "testimonials", "faq", "gallery", "cta", "contact-form"]);

/**
 * AI-draft rich, on-brand sections for ANY page (incl. custom titles) — Gemini first, then the BYOK
 * provider, with a deterministic fallback handled by the caller. Returns validated section content
 * objects (same shape as draft_sections). NEVER fabricates specific facts (no fake clients, awards,
 * prices, addresses, phone numbers) — that rule is in the prompt and enforced by type allow-listing.
 */
async function aiSectionsForPage(tenantId: string, w: Record<string, any>, title: string): Promise<Record<string, unknown>[] | null> {
  const ctx = [
    w.businessName && `Business: ${w.businessName}`,
    w.industry && `Industry: ${w.industry}`,
    w.audience && `Audience: ${w.audience}`,
    w.services && `Services: ${w.services}`,
    w.description && `About: ${w.description}`,
    w.tone && `Tone: ${w.tone}`,
  ].filter(Boolean).join("\n");
  const system =
    `You are a senior conversion copywriter and web designer. Draft the "${title}" page as ONLY a JSON ` +
    `object {"sections":[...]}. Use 4-7 sections, ordered, with specific, persuasive, on-topic copy for ` +
    `THIS page's purpose. Allowed section shapes (use only these):\n` +
    `{"type":"hero","heading":"","subheading":"","primaryCta":{"label":"","href":"/contact"}}\n` +
    `{"type":"features","heading":"","features":[{"title":"","description":""}]}\n` +
    `{"type":"text","text":""}\n` +
    `{"type":"bullet-list","bulletStyle":"check","items":[{"text":""}]}\n` +
    `{"type":"testimonials","heading":"","items":[{"quote":"","name":"Satisfied client","role":""}]}\n` +
    `{"type":"faq","items":[{"q":"","a":""}]}\n` +
    `{"type":"cta","heading":"","cta":{"label":"","href":"/contact"}}\n` +
    `{"type":"contact-form","heading":"","fields":[{"name":"name","label":"Name","type":"text"},{"name":"email","label":"Email","type":"email"}],"submitLabel":"Send"}\n` +
    `RULES: Do NOT invent specific facts — no fake client names, awards, statistics, prices, addresses, ` +
    `or phone numbers. Keep testimonials generic ("name":"Satisfied client"). Hrefs are "/contact" or "#". JSON only.`;

  const parse = (raw: string): Record<string, unknown>[] | null => {
    try {
      const j = JSON.parse(stripFences(raw));
      const arr = Array.isArray(j?.sections) ? j.sections : Array.isArray(j) ? j : null;
      if (!arr) return null;
      const secs = arr.filter((s: any) => s && typeof s.type === "string" && ALLOWED_SECTION_TYPES.has(s.type)).slice(0, 8);
      // Normalize testimonials to the schema shape (items need `name`, not `author`).
      for (const s of secs) {
        if (s.type === "testimonials" && Array.isArray(s.items)) {
          s.items = s.items.map((it: any) => ({ name: it.name || it.author || "Satisfied client", role: it.role, quote: it.quote || "" }));
        }
      }
      return secs.length ? secs : null;
    } catch { return null; }
  };

  // Gemini direct (the key this env has).
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    try {
      const model = process.env.AI_PLAN_MODEL || "gemini-2.5-flash";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${system}\n\n${ctx}` }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.6 } }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const j = await res.json();
        const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
        const out = text ? parse(text) : null;
        if (out) return out;
      }
    } catch { /* fall through */ }
  }
  // BYOK provider fallback.
  const out = await llm.complete({ system, user: ctx, jsonObject: true, temperature: 0.6 }, tenantId);
  return out ? parse(out) : null;
}

/** Infer a template family from free-text industry/services (heuristic). */
function familyFromIndustry(text: string): TemplateFamily {
  const t = (text || "").toLowerCase();
  if (/real\s?estate|realtor|realty|broker|property|homes|listing/.test(t)) return "realtor";
  if (/agency|marketing|studio|consult|creative|software|saas|app|platform|tech/.test(t)) return "agency";
  if (/plumb|hvac|clean|landscap|salon|spa|dental|clinic|repair|contractor|restaurant|cafe|local/.test(t)) return "local-service";
  if (/portfolio|photograph|designer|artist|architect|freelanc/.test(t)) return "portfolio";
  if (/startup|launch|fintech|venture|founder/.test(t)) return "startup";
  return "agency";
}

// Identify as a real browser — "bot" UAs are frequently blocked (Cloudflare/WAF), which would leave
// us unable to read the owner's own site (no socials, name, colors, or location).
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Extract city/country from the page deterministically (JSON-LD PostalAddress, then OG meta). */
function locationFromHtml(html: string): { city?: string; country?: string } {
  let city = "", country = "";
  const loc = html.match(/"addressLocality"\s*:\s*"([^"]{2,60})"/i); if (loc) city = loc[1];
  let c = html.match(/"addressCountry"\s*:\s*"([A-Za-z .'-]{2,60})"/i);
  if (!c) c = html.match(/"addressCountry"\s*:\s*\{[^}]*"name"\s*:\s*"([A-Za-z .'-]{2,60})"/i);
  if (c) country = c[1];
  if (!city) { const m = html.match(/<meta[^>]+property=["']business:contact_data:locality["'][^>]+content=["']([^"']{2,60})["']/i); if (m) city = m[1]; }
  if (!country) { const m = html.match(/<meta[^>]+property=["']business:contact_data:country_name["'][^>]+content=["']([^"']{2,60})["']/i); if (m) country = m[1]; }
  return { city: city.trim() || undefined, country: country.trim() || undefined };
}

/** Extract social-profile links from raw HTML (deduped, capped). Used to pre-fill the wizard. */
function socialLinksFromHtml(html: string): string[] {
  const re = /https?:\/\/(?:www\.)?(?:facebook|fb|instagram|linkedin|tiktok|youtube|youtu\.be|x\.com|twitter|pinterest|threads)\.[a-z.]+\/[^"'\s<>)]+/gi;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(re)) {
    let url = m[0].replace(/[)"'.,]+$/, "");
    // Skip share/intent/widget links and bare domains.
    if (/\/(sharer|share|intent|plugins|embed|widgets?)\b/i.test(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
    if (out.length >= 8) break;
  }
  return out;
}

/** Best-effort logo URL from raw HTML (og:logo / og:image / <img> with "logo" in src|alt|class). */
function logoFromHtml(html: string, baseUrl: string): string | undefined {
  const abs = (u: string): string | undefined => {
    try { return new URL(u, /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`).toString(); } catch { return undefined; }
  };
  const og = html.match(/<meta[^>]+property=["']og:logo["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return abs(og[1]);
  const imgs = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((m) => m[0]);
  for (const tag of imgs) {
    if (!/logo/i.test(tag)) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (src && !/^data:/i.test(src)) return abs(src);
  }
  return undefined;
}

/** Pick a usable brand color from raw HTML (theme-color meta, else first non-neutral hex). */
function brandColorFromHtml(html: string): string | undefined {
  const tc = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{6})["']/i);
  if (tc) return tc[1].toLowerCase();
  // First hex that isn't near-black / near-white / gray.
  const hexes = Array.from(html.matchAll(/#([0-9a-fA-F]{6})\b/g)).map((m) => m[1].toLowerCase());
  for (const h of hexes) {
    const n = parseInt(h, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 28) continue;          // too gray
    if (max < 40 || min > 220) continue;   // too dark / too light
    return `#${h}`;
  }
  return undefined;
}

/**
 * UPFRONT ENRICHMENT (Ali / "what an AI website builder should do"): read the business's
 * existing website BEFORE the wizard is filled, and extract a profile to PRE-FILL the
 * wizard — business name, industry, services, audience, tone, brand color, image count.
 * Uses the LLM for the inferred fields (industry/services/audience/tone) when a key is
 * configured, with a deterministic heuristic fallback. NO writes, NO AI spend on images.
 */
export async function enrichFromPresence(
  tenantId: string,
  input: { websiteUrl?: string; blogUrl?: string; socialLinks?: string[]; businessDescription?: string }
): Promise<EnrichedProfile> {
  const url = (input.websiteUrl || input.blogUrl || "").trim();
  if (!url) return { found: false, notes: "Enter your website (or blog) URL, then Analyze." };

  // Fetch raw HTML once for name/color parsing, plus the distilled context for the LLM.
  let html = "";
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    const res = await fetch(u.toString(), {
      headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12000), redirect: "follow",
    });
    if (res.ok) html = (await res.text()).slice(0, 400_000);
  } catch { /* unreachable → fall through */ }

  const ctx = await fetchSiteContext(url);
  if (!html && !ctx) return { found: false, sourceUrl: url, notes: "Couldn't reach that site — it may block bots. You can fill the wizard manually." };

  // Deterministic bits from HTML.
  const pick = (re: RegExp) => { const m = html.match(re); return m ? m[1].replace(/\s+/g, " ").trim() : ""; };
  const ogName = pick(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const rawTitle = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const cleanTitle = rawTitle.split(/[|–—\-:·•]/)[0].trim(); // before the first separator
  const businessName = (ogName || cleanTitle || "").slice(0, 80);
  const primaryColor = brandColorFromHtml(html);
  const imageCount = ctx?.images?.length ?? 0;

  // Inferred bits via LLM (JSON), with heuristic fallback. The owner's own description (when given)
  // is prepended as the strongest signal so industry/audience reflect what THEY say they do.
  let industry = "", services = "", audience = "", country = "", city = "", description = "", tone: BrandTone | undefined;
  const desc = (input.businessDescription || "").trim();
  const pageText = [desc ? `The business owner describes their business as: ${desc}` : "", ctx?.text ?? ""].filter(Boolean).join("\n\n");
  // Social links come ONLY from the owner's OWN site HTML (homepage → their blog → their contact/about
  // page) — never a web search. Many sites only list socials in the footer of inner pages.
  const socialLinks = socialLinksFromHtml(html);
  const logoUrl = logoFromHtml(html, url);
  const grabFrom = async (target: string) => {
    try {
      const tu = new URL(target, /^https?:\/\//i.test(url) ? url : `https://${url}`);
      const r = await fetch(tu.toString(), { headers: { "user-agent": BROWSER_UA, accept: "text/html" }, signal: AbortSignal.timeout(8000), redirect: "follow" });
      if (!r.ok) return;
      const h = (await r.text()).slice(0, 300_000);
      for (const s of socialLinksFromHtml(h)) if (socialLinks.length < 8 && !socialLinks.includes(s)) socialLinks.push(s);
    } catch { /* best-effort */ }
  };
  if (input.blogUrl && input.blogUrl.trim() && input.blogUrl.trim() !== url) await grabFrom(input.blogUrl.trim());
  if (socialLinks.length < 2) {
    // Find a same-origin contact/about link on the homepage and scan it too.
    let origin = ""; try { origin = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).origin; } catch { /* */ }
    if (origin) {
      for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
        if (socialLinks.length >= 2) break;
        const href = m[1];
        if (!/contact|about|connect/i.test(href)) continue;
        if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
        try { if (new URL(href, origin).origin === origin) await grabFrom(href); } catch { /* */ }
      }
    }
  }
  const loc = locationFromHtml(html);
  if (pageText) {
    const j = await aiExtractProfile(pageText, tenantId);
    if (j) {
      industry = typeof j.industry === "string" ? j.industry.slice(0, 80) : "";
      services = typeof j.services === "string" ? j.services.slice(0, 200) : "";
      audience = typeof j.audience === "string" ? j.audience.slice(0, 120) : "";
      description = typeof j.description === "string" ? j.description.slice(0, 280) : "";
      country = normalizeCountry(typeof j.country === "string" ? j.country : "");
      city = typeof j.city === "string" ? j.city.slice(0, 80) : "";
      if (typeof j.tone === "string" && (BRAND_TONES as readonly string[]).includes(j.tone.toLowerCase())) tone = j.tone.toLowerCase() as BrandTone;
    }
    if (!services) {
      // Heuristic: use the strongest headings as a services hint.
      const heads = (pageText.match(/headings:\s*(.+)/i)?.[1] ?? "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4);
      if (heads.length) services = heads.join(", ").slice(0, 200);
    }
  }

  // Location fallback: deterministic page extraction fills city/country when the AI couldn't.
  if (!city && loc.city) city = loc.city.slice(0, 80);
  if (!country && loc.country) { const n = normalizeCountry(loc.country); if (n) country = n; }

  // Description: prefer the owner's own words, else the AI summary, else an industry+services synthesis.
  const finalDescription = desc || description || [industry, services].filter(Boolean).join(" — ") || "";
  // Fill the Basics fields fully from what we collected: derive audience/services when the AI left them blank.
  if (!services && finalDescription) services = finalDescription.slice(0, 200);
  if (!audience && (industry || finalDescription)) audience = audienceSuggestionsFor(industry, finalDescription, services).slice(0, 3).join(", ");
  const templateFamily = familyFromIndustry(`${industry} ${services} ${businessName}`);
  const filled = [businessName && "name", finalDescription && "description", industry && "industry", services && "services", audience && "audience", socialLinks.length && `${socialLinks.length} social links`, logoUrl && "logo", country && "country", city && "city", tone && "tone", primaryColor && "brand color", imageCount && `${imageCount} images`].filter(Boolean);

  return {
    found: !!(businessName || industry || services || finalDescription || country || primaryColor || imageCount || socialLinks.length),
    businessName: businessName || undefined,
    description: finalDescription || undefined,
    industry: industry || undefined,
    services: services || undefined,
    audience: audience || undefined,
    socialLinks: socialLinks.length ? socialLinks : undefined,
    logoUrl: logoUrl || undefined,
    country: country || undefined,
    city: city || undefined,
    tone,
    primaryColor,
    templateFamily,
    imageCount,
    sourceUrl: url,
    notes: filled.length ? `Found: ${filled.join(", ")}. Review and edit anything below.` : "We reached the site but couldn't extract much — fill in the wizard manually.",
  };
}

/**
 * Create a DRAFT website from the wizard. Sequential best-effort with rollback on the
 * website insert: if any post-insert step fails we keep the draft skeleton (Copilot's
 * "AI fail → keep draft, no rollback") — only a failed website insert yields no record.
 */
export async function createWebsiteFromWizard(
  tenantId: string,
  payload: WizardPayload
): Promise<CreateWizardResult> {
  const name = (payload.businessName || "").trim();
  if (!name) return { ok: false, error: "Business name is required." };
  if (!payload.industry?.trim()) return { ok: false, error: "Industry is required." };
  if (!payload.country?.trim()) return { ok: false, error: "Country is required." };

  // Re-validate the subdomain server-side (never trust the client's last check).
  const check = await checkSubdomain(payload.subdomain);
  if (!check.available) {
    return { ok: false, error: `Subdomain "${check.normalized}" is not available (${check.reason}).` };
  }
  const subdomain = check.normalized;
  const slug = subdomain || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "site";

  const supabase = createSupabaseServiceClient();

  // First website for this tenant becomes primary.
  const { count } = await supabase
    .from("websites").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
  const isPrimary = (count ?? 0) === 0;

  const tone: BrandTone = (BRAND_TONES as readonly string[]).includes(payload.tone)
    ? payload.tone : "professional";
  const primaryColor = /^#[0-9a-fA-F]{6}$/.test(payload.primaryColor || "")
    ? payload.primaryColor
    : TONE_DEFAULT_COLOR[tone];

  const wizardJson = {
    version: 1,              // wizard_version (Copilot ruling) — gate future migrations
    businessName: name,
    industry: payload.industry.trim(),
    country: payload.country.trim(),
    city: payload.city?.trim() || null,
    audience: payload.audience?.trim() || null,
    services: payload.services?.trim() || null,
    description: payload.businessDescription?.trim() || null,
    tone,
    hasWebsite: !!payload.hasWebsite,
    existingUrl: payload.existingUrl?.trim() || null,
    existingBlog: payload.existingBlog?.trim() || null,
    socialLinks: (payload.socialLinks || []).map((s) => s.trim()).filter(Boolean),
    aiConsent: !!payload.aiConsent,
    templateFamily: payload.templateFamily,
    primaryColor,
    logoUrl: payload.logoUrl?.trim() || null,
    plannedPages: (payload.pages || []).map((t) => String(t || "").trim()).filter(Boolean),
    importMode: payload.importMode === "exact" ? "exact" : "rebuild",
    // makePublicNow is intentionally NOT acted on here — DRAFT only.
    makePublicNowRequested: !!payload.makePublicNow,
  };

  // No existing site → research similar businesses so the AI builds a similar-but-better one.
  // Stash the brief + the benchmarked URLs so the build uses them and we can show who we studied.
  if (!wizardJson.hasWebsite) {
    try {
      const ins = await researchCompetitors(wizardJson.industry, wizardJson.city ?? undefined, wizardJson.services ?? undefined);
      if (ins) { (wizardJson as Record<string, unknown>).competitorBrief = ins.brief; (wizardJson as Record<string, unknown>).benchmarkedSites = ins.urls; }
    } catch { /* best-effort */ }
  }

  // ---- 1. Insert the website row (draft). Failure here = no record. ----
  // Try the full payload; if the 0026 columns don't exist yet, retry without them.
  let websiteId: string;
  {
    const full = {
      tenant_id: tenantId, name, slug, is_primary: isPrimary,
      subdomain, status: "draft", wizard: wizardJson,
    };
    let res = await supabase.from("websites").insert(full).select("id").single();
    if (res.error) {
      const fallback = { tenant_id: tenantId, name, slug, is_primary: isPrimary };
      res = await supabase.from("websites").insert(fallback).select("id").single();
      if (res.error) return { ok: false, error: res.error.message };
    }
    websiteId = (res.data as { id: string }).id;
  }

  // ---- 2. Per-(tenant, website) brand row so theme reads are EXACT (Option A). ----
  // Seed a full cohesive theme from the chosen template family (theme-factory palette +
  // font pairing). The wizard's color picker overrides only the PRIMARY color.
  const fam = (FAMILY_THEME as Record<string, any>)[payload.templateFamily as TemplateFamily] ?? FAMILY_THEME.agency;
  // Prefer the explicit palette + typography chosen on the Design step; fall back to the family theme.
  const secondary = payload.secondaryColor?.trim() || fam.secondary;
  const accent = payload.accentColor?.trim() || fam.accent;
  const headingFont = payload.fontHeading?.trim() || fam.headingFont;
  const bodyFont = payload.fontBody?.trim() || fam.bodyFont;
  const background = payload.backgroundColor?.trim() || "#ffffff";
  const textColor = payload.textColor?.trim() || "#0f172a";
  const linkColor = payload.linkColor?.trim() || primaryColor;
  const brandTheme: Record<string, any> = {
    colors: { primary: primaryColor, secondary, accent, background, text: textColor, link: linkColor },
    fonts: { heading: headingFont, body: bodyFont },
    // The chosen background actually renders behind the page (ElementStyle.bg accepts a hex).
    pageBackground: { bg: background },
  };
  try {
    await supabase.from("website_brand_settings").upsert(
      {
        tenant_id: tenantId, website_id: websiteId, theme: brandTheme,
        primary_color: primaryColor, secondary_color: secondary, accent_color: accent,
        font_heading: headingFont, font_body: bodyFont,
        ...(payload.logoUrl?.trim() ? { logo_url: payload.logoUrl.trim() } : {}),
      },
      { onConflict: "tenant_id,website_id" }
    );
  } catch {
    // Column subset may differ pre-migration — retry with the jsonb theme only.
    try {
      await supabase.from("website_brand_settings").upsert(
        { tenant_id: tenantId, website_id: websiteId, theme: brandTheme },
        { onConflict: "tenant_id,website_id" }
      );
    } catch { /* non-fatal: editor BrandPanel can create it on first save */ }
  }

  // ---- 3. Reserve the subdomain host (no DNS). ----
  try {
    await supabase.from("domains").insert({
      tenant_id: tenantId, website_id: websiteId,
      host: check.host, kind: "subdomain", is_primary: true, verified: false,
    });
  } catch { /* domains table optional / host unique race — non-fatal */ }

  // ---- 4. Build the pages. ----
  // Consent ON  → AI generates a 5–7 page draft site (deterministic fallback if no LLM key).
  // Consent OFF → minimal skeleton (Home / About / Contact), NO AI calls (Copilot ruling).
  let pagesCreated = 0;
  let aiUsed = false;
  const hasPlan = (wizardJson.plannedPages?.length ?? 0) > 0;
  if (payload.aiConsent || hasPlan) {
    try {
      // Builds exactly the user's planned pages (deterministic sections, AI-enriched when consent is on).
      pagesCreated = await generateWizardPages(tenantId, websiteId, wizardJson);
      aiUsed = payload.aiConsent && pagesCreated > 0;
    } catch { /* fall through to skeleton */ }
  }
  if (pagesCreated === 0) {
    pagesCreated = await scaffoldSkeleton(tenantId, websiteId, payload.aiConsent, wizardJson);
  }

  return { ok: true, websiteId, subdomain, host: check.host, pagesCreated, aiUsed, benchmarkedSites: (wizardJson as Record<string, any>).benchmarkedSites };
}

/** Minimal hand-built skeleton when AI is off or generation failed. Still GEO-seeded. */
async function scaffoldSkeleton(
  tenantId: string, websiteId: string, aiWasOn: boolean, wizard: Record<string, any>
): Promise<number> {
  // AI-off → Home/About/Contact; AI-failed → at least Home (keep the draft alive).
  const wanted = aiWasOn ? [{ t: "Home", s: "home", h: true }] : [
    { t: "Home", s: "home", h: true },
    { t: "About", s: "about", h: false },
    { t: "Contact", s: "contact", h: false },
  ];
  let made = 0;
  for (const p of wanted) {
    let page: { id: string } | null = null;
    try {
      page = await createPage(tenantId, { title: p.t, slug: p.s, isHome: p.h, websiteId });
    } catch {
      try { page = await createPage(tenantId, { title: p.t, slug: `${p.s}-${websiteId.slice(0, 8)}`, isHome: p.h, websiteId }); }
      catch { /* skip this page */ }
    }
    if (page) {
      made++;
      try { await saveDraft(page.id, tenantId, { draft_seo: geoSeoForPage(p.t, wizard) }); } catch { /* non-fatal */ }
    }
  }
  return made;
}

/**
 * AI multi-page generation for the wizard (Copilot ruling — gated on aiConsent).
 * WEBSITE-SCOPED: every page is created under `websiteId`. Uses the shared planner
 * (generatePlan → deterministic fallbackPlan when no LLM key) so it always returns a
 * real draft. DRAFT-ONLY: nothing is published. Returns the number of pages created.
 */
/** Merge fonts/colors learned from the source site into the website's brand theme (extracted wins
 *  for whatever it confidently found; existing values are kept otherwise). Best-effort. */
async function applyImportedTheme(tenantId: string, websiteId: string, t: ExtractedTheme): Promise<void> {
  if (!t || (!Object.keys(t.fonts).length && !Object.keys(t.colors).length)) return;
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("website_brand_settings").select("theme")
    .eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
  const theme: Record<string, any> = (data?.theme && typeof data.theme === "object") ? { ...data.theme } : {};
  const colors: Record<string, any> = { ...(theme.colors || {}) };
  const fonts: Record<string, any> = { ...(theme.fonts || {}) };
  for (const [k, v] of Object.entries(t.colors)) if (v) colors[k] = v;
  if (t.fonts.heading) fonts.heading = t.fonts.heading;
  if (t.fonts.body) fonts.body = t.fonts.body;
  theme.colors = colors; theme.fonts = fonts;
  if (t.colors.background) theme.pageBackground = { ...(theme.pageBackground || {}), bg: t.colors.background };

  const patch: Record<string, any> = { tenant_id: tenantId, website_id: websiteId, theme };
  if (t.colors.primary) patch.primary_color = t.colors.primary;
  if (t.colors.secondary) patch.secondary_color = t.colors.secondary;
  if (t.colors.accent) patch.accent_color = t.colors.accent;
  if (t.fonts.heading) patch.font_heading = t.fonts.heading;
  if (t.fonts.body) patch.font_body = t.fonts.body;
  try { await sb.from("website_brand_settings").upsert(patch, { onConflict: "tenant_id,website_id" }); }
  catch { try { await sb.from("website_brand_settings").upsert({ tenant_id: tenantId, website_id: websiteId, theme }, { onConflict: "tenant_id,website_id" }); } catch { /* ignore */ } }
}

export async function generateWizardPages(
  tenantId: string, websiteId: string, wizard: Record<string, any>
): Promise<number> {
  // Learn from the tenant's existing site once: text → brief, images → fill section slots.
  const ctx = wizard.hasWebsite ? await fetchSiteContext(wizard.existingUrl) : null;
  // Competitor research (for no-website builds) is done up-front in createWebsiteFromWizard and stashed.
  const brief = buildBrief(wizard, ctx?.text ?? null, wizard.competitorBrief ?? null);
  const learnedImages = ctx?.images ?? [];
  const { applyTemplateImages } = await import("@/lib/sections/prebuilt-templates");
  const { generatePlan } = await import("@/lib/agent/builder");
  const { planToSitePreview, sanitizeForDraft } = await import("@/lib/agent/website-generator");

  // AI plan only when consent is on (and a key exists); otherwise we build deterministically.
  let aiPages: any[] = [];
  if (wizard.aiConsent) {
    try {
      const r = await generatePlan({ tenantId, role: "website.editor", goal: brief });
      if (r.plan) {
        const preview = planToSitePreview(r.plan);
        aiPages = sanitizeForDraft({ pages: preview.pages ?? [], warnings: [] }).pages ?? [];
      }
    } catch { /* deterministic fallback below */ }
  }

  const profile = profileFromWizard(wizard);
  const plannedTitles: string[] = Array.isArray(wizard.plannedPages)
    ? wizard.plannedPages.map((t: any) => String(t || "").trim()).filter(Boolean) : [];
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

  // Imported site chrome (header/footer) → shared global blocks, set once after pages exist.
  let importedChrome: ImportedChrome | null = null;

  let chosen: any[];
  if (plannedTitles.length) {
    // Build EXACTLY the user's planned pages. Priority per page:
    //   1) CLONE the owner's existing site (faithful copy of their real content/images),
    //   2) reuse AI sections where a title matches, 3) deterministic template.
    const baseUrl = wizard.existingUrl ? (/^https?:\/\//i.test(wizard.existingUrl) ? wizard.existingUrl : `https://${wizard.existingUrl}`) : "";
    const hasSite = !!(wizard.hasWebsite && wizard.existingUrl);
    const exact = wizard.importMode === "exact";
    const homeHtml = hasSite ? await fetchPage(wizard.existingUrl) : null;
    // Recognise the source site's header + footer → editable global Header/Footer blocks,
    // and its fonts + colors → the website theme (so the import reproduces the look).
    if (homeHtml) {
      try { importedChrome = importChrome(homeHtml, baseUrl); } catch { /* keep defaults */ }
      try { await applyImportedTheme(tenantId, websiteId, extractTheme(homeHtml)); } catch { /* keep theme */ }
    }
    // Sitemap discovery → copy EVERY page, not just homepage-linked ones.
    const sitemapUrls = hasSite ? await discoverSitemapUrls(baseUrl) : [];
    const htmlCache = new Map<string, string | null>();
    const getHtml = async (u: string) => { if (!htmlCache.has(u)) htmlCache.set(u, await fetchPage(u)); return htmlCache.get(u) ?? null; };
    chosen = [];
    for (let i = 0; i < plannedTitles.length; i++) {
      const title = plannedTitles[i];
      const isHome = i === 0;
      const ptype = guessPageType(title);
      // 1) Copy from their existing site (sitemap → homepage links). Exact snapshot or structured rebuild.
      if (hasSite) {
        const srcUrl = (isHome || ptype === "home") ? baseUrl : pickUrlForType(sitemapUrls, homeHtml || "", baseUrl, ptype);
        const srcHtml = srcUrl ? (isHome || ptype === "home" ? homeHtml : await getHtml(srcUrl)) : null;
        if (srcHtml && srcUrl) {
          // Carry the source page's real SEO/GEO meta (title, description, canonical, schema) forward.
          let _seo: Record<string, unknown> | null = null;
          try { _seo = extractSeo(srcHtml) as Record<string, unknown>; } catch { /* synthetic SEO fallback */ }
          if (exact) {
            const sec = await buildExactCopyIframe(srcHtml, srcUrl);
            if (sec) { chosen.push({ title, slug: slugifyTitle(title), isHome, _cloned: true, _seo, sections: [{ content: sec }] }); continue; }
          }
          const secs = cloneSectionsFromHtml(srcHtml, srcUrl);
          if (secs.length) { chosen.push({ title, slug: slugifyTitle(title), isHome, _cloned: true, _seo, sections: secs.map((content) => ({ content })) }); continue; }
        }
      }
      // 2) AI sections where a title matches the site plan.
      const ai = aiPages.find((p: any) => norm(p.title || "") === norm(title)) ?? (isHome ? (aiPages.find((p: any) => p.isHome) ?? aiPages[0]) : undefined);
      if (ai) { chosen.push({ ...ai, title, isHome }); continue; }
      // 2b) Full AI draft for THIS page — covers custom titles the site plan didn't include.
      if (wizard.aiConsent) {
        const aiSecs = await aiSectionsForPage(tenantId, wizard, title);
        if (aiSecs && aiSecs.length) { chosen.push({ title, slug: slugifyTitle(title), isHome, sections: aiSecs.map((content) => ({ content })) }); continue; }
      }
      // 3) Deterministic fallback (no AI key / AI unavailable).
      chosen.push({ title, slug: slugifyTitle(title), isHome, sections: generatedSectionsFor(ptype, profile).map((content) => ({ content })) });
    }
  } else if (aiPages.length) {
    // Legacy lean path: Home + Contact now, stash the rest as suggestions.
    const homePage = aiPages.find((p: any) => p.isHome) ?? aiPages[0];
    const contactPage = aiPages.find((p: any) => p !== homePage && /contact|get in touch|reach|enquir|inquir/i.test(p.title))
      ?? aiPages.find((p: any) => p !== homePage);
    chosen = [homePage, contactPage].filter(Boolean) as any[];
    const suggestedPages = aiPages.filter((p: any) => !chosen.includes(p)).map((p: any) => p.title).filter(Boolean);
    try {
      const sb = createSupabaseServiceClient();
      const { data: row } = await sb.from("websites").select("wizard").eq("id", websiteId).maybeSingle();
      const w = (row?.wizard && typeof row.wizard === "object") ? row.wizard : {};
      await sb.from("websites").update({ wizard: { ...w, suggestedPages, learnedBrief: brief.slice(0, 6000), learnedImages } }).eq("id", websiteId);
    } catch { /* non-fatal — suggestions are a nicety */ }
  } else {
    return 0; // nothing to build → caller scaffolds a skeleton
  }

  let created = 0;
  const usedSlugs = new Set<string>();
  let homeAssigned = false;
  for (const pg of chosen) {
    let base = (pg.slug || pg.title || "page").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";
    let slug = base, n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`.slice(0, 40);
    usedSlugs.add(slug);
    const isHome = !homeAssigned && (pg.isHome || created === 0);
    if (isHome) homeAssigned = true;
    try {
      // Page slugs are unique per tenant today → fall back to a website-unique slug.
      let page;
      try {
        page = await createPage(tenantId, { title: pg.title || "Untitled", slug, isHome, websiteId });
      } catch {
        page = await createPage(tenantId, { title: pg.title || "Untitled", slug: `${slug}-${websiteId.slice(0, 8)}`, isHome, websiteId });
      }
      let sections = (pg.sections ?? []).map((s: any) => s.content).filter(Boolean);
      // Reuse the existing site's own images for TEMPLATE pages; cloned pages already carry real images.
      if (learnedImages.length && sections.length && !pg._cloned) {
        try { sections = applyTemplateImages(sections as any, learnedImages) as any[]; } catch { /* keep originals */ }
      }
      // Synthetic GEO SEO as the base; override with the source page's REAL meta where we found it.
      const draft_seo: Record<string, unknown> = geoSeoForPage(pg.title || "", wizard);
      const src = pg._seo as Record<string, unknown> | null | undefined;
      if (src) {
        if (src.title) draft_seo.title = src.title;
        if (src.description) draft_seo.description = src.description;
        if (src.schema_type) draft_seo.schema_type = src.schema_type;
        if (Array.isArray(src.schemas) && src.schemas.length) draft_seo.schemas = src.schemas;
        if (src.canonical) draft_seo.canonical_url = src.canonical;
        if (src.image) { draft_seo.image = src.image; draft_seo.seo_image_url = src.image; }
      }
      await saveDraft(page.id, tenantId, {
        ...(sections.length ? { draft_sections: sections as any } : {}),
        draft_seo,
      });
      created++;
    } catch { /* skip the page that failed; keep the rest */ }
  }

  // Apply the imported header/footer as the site-wide global blocks (once, shared across all pages).
  if (importedChrome && (importedChrome.header || importedChrome.footer)) {
    try {
      await setWebsiteChrome(tenantId, websiteId, String(wizard.businessName || wizard.companyName || "Site"),
        importedChrome.header ?? undefined, importedChrome.footer ?? undefined);
    } catch { /* non-fatal — pages keep the default global blocks */ }
  }

  return created;
}

// ---------------------------------------------------------------------------
// Refine loop (Ali): after the lean 2-page build, let the user add the AI's
// suggested pages and tweak the context the AI used, then regenerate.
// ---------------------------------------------------------------------------

export interface WebsiteSuggestions {
  suggestedPages: string[];
  audience: string;
  services: string;
  benchmarkedSites: string[];
}

/** Read the stashed AI suggestions + the context the build used, for the refine panel. */
export async function listWebsiteSuggestions(tenantId: string, websiteId: string): Promise<WebsiteSuggestions> {
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("websites").select("wizard").eq("tenant_id", tenantId).eq("id", websiteId).maybeSingle();
    const w: any = (data?.wizard && typeof data.wizard === "object") ? data.wizard : {};
    return {
      suggestedPages: Array.isArray(w.suggestedPages) ? w.suggestedPages : [],
      audience: typeof w.audience === "string" ? w.audience : "",
      services: typeof w.services === "string" ? w.services : "",
      benchmarkedSites: Array.isArray(w.benchmarkedSites) ? w.benchmarkedSites : [],
    };
  } catch { return { suggestedPages: [], audience: "", services: "", benchmarkedSites: [] }; }
}

/** Update the audience/services the AI uses, and refresh the stored brief. */
export async function refineWebsiteContext(
  tenantId: string, websiteId: string, patch: { audience?: string; services?: string }
): Promise<{ ok: boolean }> {
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("websites").select("wizard").eq("tenant_id", tenantId).eq("id", websiteId).maybeSingle();
    const w: any = (data?.wizard && typeof data.wizard === "object") ? { ...data.wizard } : {};
    if (patch.audience !== undefined) w.audience = patch.audience;
    if (patch.services !== undefined) w.services = patch.services;
    w.learnedBrief = buildBrief(w, typeof w.learnedText === "string" ? w.learnedText : null).slice(0, 6000);
    await sb.from("websites").update({ wizard: w }).eq("tenant_id", tenantId).eq("id", websiteId);
    return { ok: true };
  } catch { return { ok: false }; }
}

/**
 * Generate ONE more page (from the suggestion list, or any title) using the SAME
 * learned context + images, then remove it from the suggestions. Draft-only.
 */
export async function addSuggestedPage(
  tenantId: string, websiteId: string, title: string
): Promise<{ ok: boolean; pageId?: string; error?: string }> {
  const clean = (title || "").trim();
  if (!clean) return { ok: false, error: "Page title required." };
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("websites").select("wizard").eq("tenant_id", tenantId).eq("id", websiteId).maybeSingle();
  const w: any = (data?.wizard && typeof data.wizard === "object") ? data.wizard : {};
  const brief = typeof w.learnedBrief === "string" && w.learnedBrief ? w.learnedBrief : buildBrief(w, null);
  const learnedImages: string[] = Array.isArray(w.learnedImages) ? w.learnedImages : [];

  // Try to source real sections for this page from the planner; fall back to the
  // default page scaffold (hero + body) when the planner has no match.
  let sections: any[] = [];
  try {
    const { generatePlan } = await import("@/lib/agent/builder");
    const { planToSitePreview, sanitizeForDraft } = await import("@/lib/agent/website-generator");
    const r = await generatePlan({ tenantId, role: "website.editor", goal: `${brief}\nFocus this page on: ${clean}.` });
    if (r.plan) {
      const { pages } = sanitizeForDraft({ pages: planToSitePreview(r.plan).pages ?? [], warnings: [] });
      const match = pages.find((p: any) => p.title?.toLowerCase().includes(clean.toLowerCase()) || clean.toLowerCase().includes(p.title?.toLowerCase()));
      sections = ((match ?? pages[0])?.sections ?? []).map((s: any) => s.content).filter(Boolean);
    }
  } catch { /* fall back to scaffold */ }

  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";
  let page: { id: string };
  try {
    page = await createPage(tenantId, { title: clean, slug, isHome: false, websiteId });
  } catch {
    try { page = await createPage(tenantId, { title: clean, slug: `${slug}-${websiteId.slice(0, 8)}`, isHome: false, websiteId }); }
    catch (e: any) { return { ok: false, error: e?.message ?? "Could not create page." }; }
  }

  if (learnedImages.length && sections.length) {
    try {
      const { applyTemplateImages } = await import("@/lib/sections/prebuilt-templates");
      sections = applyTemplateImages(sections as any, learnedImages) as any[];
    } catch { /* keep originals */ }
  }
  try {
    await saveDraft(page.id, tenantId, {
      ...(sections.length ? { draft_sections: sections as any } : {}),
      draft_seo: geoSeoForPage(clean, w),
    });
  } catch { /* page exists with scaffold; non-fatal */ }

  // Remove from the suggestion list.
  try {
    const remaining = (Array.isArray(w.suggestedPages) ? w.suggestedPages : []).filter((t: string) => t.toLowerCase() !== clean.toLowerCase());
    await sb.from("websites").update({ wizard: { ...w, suggestedPages: remaining } }).eq("tenant_id", tenantId).eq("id", websiteId);
  } catch { /* non-fatal */ }

  return { ok: true, pageId: page.id };
}

// Country → BCP-47 language (GEO/SEO signal). Defaults to English.
const COUNTRY_LANG: Record<string, string> = {
  france: "fr", "côte d'ivoire": "fr", belgium: "fr", germany: "de", austria: "de",
  spain: "es", mexico: "es", argentina: "es", italy: "it", portugal: "pt", brazil: "pt",
  netherlands: "nl", "saudi arabia": "ar", uae: "ar", "united arab emirates": "ar",
};
function langForCountry(country?: string): string {
  return COUNTRY_LANG[(country || "").trim().toLowerCase()] ?? "en";
}

/**
 * GEO/SEO defaults for a generated page (uses the schema-markup + ai-visibility skill
 * knowledge): picks a schema.org type per page intent, seeds author/language/focus
 * keyword so the published page emits rich JSON-LD and scores well for AI answer engines.
 */
function geoSeoForPage(pageTitle: string, w: Record<string, any>): Record<string, any> {
  const name = w.businessName as string;
  const t = (pageTitle || "").toLowerCase();
  const hasLocal = !!w.city; // a physical locale → LocalBusiness is the strongest signal
  let schema_type = "WebPage";
  const schemas = new Set<string>([hasLocal ? "LocalBusiness" : "Organization"]);
  if (/contact/.test(t)) { schema_type = hasLocal ? "LocalBusiness" : "Organization"; }
  else if (/service|pricing|plan|solution|tool/.test(t)) { schema_type = "Service"; schemas.add("Service"); }
  else if (/about/.test(t)) { schema_type = "AboutPage"; }
  else if (/blog|article|news|guide/.test(t)) { schema_type = "Article"; }
  else if (/home|^$/.test(t)) { schema_type = hasLocal ? "LocalBusiness" : "Organization"; }

  const loc = [w.city, w.country].filter(Boolean).join(", ");
  const focus_keyword = [w.industry, w.city].filter(Boolean).join(" ").trim().toLowerCase();
  return {
    title: `${pageTitle} — ${name}`,
    description: `${pageTitle} · ${name}${loc ? ` · ${loc}` : ""}${w.services ? ` — ${String(w.services).slice(0, 110)}` : ""}`,
    schema_type,
    schemas: Array.from(schemas),
    author: name,                       // E-E-A-T / GEO authorship
    language: langForCountry(w.country),
    focus_keyword,
  };
}

/**
 * Fetch the tenant's EXISTING website and distill it into a learning context: title,
 * meta description, headings, and a body-text excerpt. URL is tenant-provided. Defensive:
 * times out, caps size, and returns null on any failure (generation then proceeds without it).
 */
interface SiteContext { text: string; images: string[] }

async function fetchSiteContext(rawUrl?: string | null): Promise<SiteContext | null> {
  const v = (rawUrl || "").trim();
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    const res = await fetch(url.toString(), {
      headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 400_000);
    const pick = (re: RegExp) => { const m = html.match(re); return m ? m[1].replace(/\s+/g, " ").trim() : ""; };
    const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const headings = Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi))
      .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean).slice(0, 25);
    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
    const text = [
      title && `Title: ${title}`,
      desc && `Description: ${desc}`,
      headings.length && `Sections/headings: ${headings.join(" | ")}`,
      body && `Content excerpt: ${body}`,
    ].filter(Boolean).join("\n").slice(0, 3500);

    // Harvest the existing site's own images (reuse — no AI spend). Pull <img src>,
    // og:image, and CSS background-image urls; resolve to absolute; keep real photos.
    const raw = new Set<string>();
    const og = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og) raw.add(og);
    for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi)) raw.add(m[1]);
    for (const m of html.matchAll(/background-image\s*:\s*url\((["']?)([^)"']+)\1\)/gi)) raw.add(m[2]);
    const images: string[] = [];
    for (const r of raw) {
      try {
        const abs = new URL(r, url).toString();
        if (!/^https?:/i.test(abs)) continue;
        if (/\.svg(\?|$)/i.test(abs)) continue;                                   // skip vector icons
        if (/(sprite|icon|logo|favicon|pixel|spacer|1x1|placeholder|avatar-default)/i.test(abs)) continue;
        if (/\.(jpe?g|png|webp|avif|gif)(\?|$)/i.test(abs) || /\/(images?|media|uploads|wp-content|assets|cdn)\//i.test(abs)) {
          images.push(abs);
        }
      } catch { /* skip bad url */ }
    }
    const uniqImages = Array.from(new Set(images)).slice(0, 14);
    if (text.length < 40 && !uniqImages.length) return null;
    return { text, images: uniqImages };
  } catch { return null; }
}

/** Map the wizard intake to a BusinessProfile for deterministic section generation. */
function profileFromWizard(w: Record<string, any>): import("@/lib/sites/page-generate").BusinessProfile {
  return {
    business_name: w.businessName || undefined,
    industry: w.industry || undefined,
    services_products: typeof w.services === "string" && w.services ? w.services.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean) : [],
    tone: w.tone || undefined,
    audience: w.audience || undefined,
    location: [w.city, w.country].filter(Boolean).join(", ") || undefined,
    logo_url: w.logoUrl || null,
    brand_colors: w.primaryColor ? [w.primaryColor] : undefined,
  };
}

/** Guess a page_type from a free-text page title (for deterministic section templates). */
function guessPageType(title: string): string {
  const t = (title || "").toLowerCase();
  if (/home/.test(t)) return "home";
  if (/about|story|team/.test(t)) return "about";
  if (/service|product|solution|offer/.test(t)) return "services";
  if (/pric|plan|package/.test(t)) return "pricing";
  if (/testimonial|review/.test(t)) return "testimonials";
  if (/faq|question/.test(t)) return "faq";
  if (/blog|news|article/.test(t)) return "blog_index";
  if (/free|guide|download|magnet|lead/.test(t)) return "lead_magnet";
  if (/thank/.test(t)) return "thank_you";
  if (/get started|^start|landing|book|quote/.test(t)) return "ad_landing";
  return "generic";
}

function slugifyTitle(title: string): string {
  return (title || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "page";
}

/**
 * Faithfully turn an existing page's HTML into ORDERED, editable sections (a real copy, no invented
 * facts). Primary: full DOM walk (html-importer) that recognizes every element in document order.
 * Fallback: the lighter headline/section extractor if the DOM walk yields nothing.
 */
function cloneSectionsFromHtml(html: string, baseUrl: string): Record<string, unknown>[] {
  try {
    const ordered = htmlToSections(html, baseUrl);
    if (ordered.length >= 2) return ordered;
  } catch { /* fall back */ }
  try {
    const ex = extractPageContent(html, baseUrl);
    return contentToBlocks(ex).map((b) => b.content);
  } catch { return []; }
}

/** Turn the wizard intake (+ learned existing-site content / competitor research) into a planner brief. */
function buildBrief(w: Record<string, any>, learnedText?: string | null, competitorBrief?: string | null): string {
  const parts: string[] = [];
  parts.push(`Create a multi-page marketing website for "${w.businessName}", a ${w.industry} business`);
  const loc = [w.city, w.country].filter(Boolean).join(", ");
  if (loc) parts.push(`based in ${loc}`);
  if (w.description) parts.push(`About the business (in the owner's words): ${w.description}`);
  if (w.audience) parts.push(`serving ${w.audience}`);
  if (w.services) parts.push(`offering: ${w.services}`);
  if (w.tone) parts.push(`Brand tone: ${w.tone}`);
  if (Array.isArray(w.plannedPages) && w.plannedPages.length) parts.push(`Required pages (draft each with full, rich, page-appropriate content): ${w.plannedPages.join(", ")}`);

  if (learnedText) {
    parts.push(
      "The business already has a website — study it and create a STRONGER, modernized version: " +
      "keep its core messaging, services, and brand identity, but improve clarity, structure, hierarchy, " +
      "and conversion. Do not copy verbatim — rewrite and elevate. Existing website to learn from:\n" + learnedText
    );
  } else {
    parts.push("Include Home, About, Services, Gallery, Testimonials and Contact pages with compelling copy.");
    if (competitorBrief) parts.push(competitorBrief);
  }
  return parts.join(". ") + ".";
}
