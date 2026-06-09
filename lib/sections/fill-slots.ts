/**
 * Phase-3 next checkpoint — LLM slot-fill (architect D-120, GEN-V3/V4/V9).
 *
 * fillSlots() asks Gemini 2.5 Flash to fill a recipe's content slots from the tenant's
 * business profile, then STRICTLY validates/repairs the result so composeSection always
 * receives a clean {slot_key: string} map. Anti-hallucination is enforced in the prompt AND
 * in code: image/link URLs are never trusted from the model (we keep the recipe default), and
 * any failure falls back to the recipe's fact-free defaults — so a bad/empty LLM response can
 * never break generation.
 *
 * Additive + standalone: NOT wired into the live wizard yet. Pure I/O boundary (one fetch),
 * never throws. Metering is the caller's responsibility (recordAiUsage) to keep this module
 * free of server-action coupling.
 */

import type { LayoutRecipe, RecipeSlot } from "./layout-recipes";
import { composeSection, defaultSlotValues } from "./layout-recipes";

export interface FillProfile {
  businessName?: string;
  industry?: string;
  /** e.g. "warm, confident, understated luxury". */
  tone?: string;
  services?: string[];
  valueProps?: string[];
  about?: string;
  city?: string;
  /** Freeform EXTRACTED content the model may repurpose (anti-hallucination anchor). */
  facts?: string;
}

export interface FillResult {
  values: Record<string, string>;
  /** true if real LLM output was used; false if we fell back to recipe defaults. */
  filled: boolean;
}

const stripFences = (s: string) => s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

function buildPrompt(recipe: LayoutRecipe, profile: FillProfile): { system: string; user: string } {
  const slotLines = recipe.slots
    .map((s) => `- ${s.key} (${s.contentType}${s.maxLength ? `, max ${s.maxLength} chars` : ""}): ${s.brief ?? "fill appropriately"}`)
    .join("\n");

  const system = [
    "You are a senior brand copywriter filling content slots for ONE website section.",
    "Output ONLY a flat JSON object mapping every slot_key to a string value. No prose, no markdown.",
    "ANTI-HALLUCINATION (critical):",
    "- NEVER invent specific facts: no names, awards, testimonials, statistics, prices, years, or client logos.",
    "- If the profile provides a fact, you may repurpose/rephrase it. If it does NOT, write generic, benefit-led, fact-free copy.",
    "- Match the brand tone. Keep within each slot's character limit. Be concrete but truthful-by-omission.",
    "- For image_url or link_url slots, return an empty string (the system supplies these).",
  ].join("\n");

  const p = profile;
  const profileBlock = [
    p.businessName && `Business: ${p.businessName}`,
    p.industry && `Industry: ${p.industry}`,
    p.tone && `Tone: ${p.tone}`,
    p.city && `Location: ${p.city}`,
    p.services?.length && `Services: ${p.services.join(", ")}`,
    p.valueProps?.length && `Value props: ${p.valueProps.join(", ")}`,
    p.about && `About: ${p.about}`,
    p.facts && `Source facts you MAY repurpose:\n${p.facts}`,
  ].filter(Boolean).join("\n");

  const user = [
    `Section purpose: ${recipe.semanticType} — "${recipe.name}".`,
    `Slots to fill:\n${slotLines}`,
    `\nBusiness profile:\n${profileBlock || "(minimal info — write generic, fact-free copy)"}`,
    `\nReturn JSON with exactly these keys: ${recipe.slots.map((s) => s.key).join(", ")}.`,
  ].join("\n");

  return { system, user };
}

/** Repair one slot value: enforce type rules + maxLength; fall back to default on anything off. */
function repairValue(slot: RecipeSlot, raw: unknown): string {
  // URLs are never trusted from the model — keep the recipe default (real images/links come
  // from the media pipeline, not the LLM).
  if (slot.contentType === "image_url" || slot.contentType === "link_url") return slot.default;
  if (typeof raw !== "string") return slot.default;
  let v = raw.trim();
  if (!v) return slot.default;
  if (slot.maxLength && v.length > slot.maxLength) {
    // Truncate at the last word boundary within the limit.
    const cut = v.slice(0, slot.maxLength);
    const sp = cut.lastIndexOf(" ");
    v = (sp > slot.maxLength * 0.6 ? cut.slice(0, sp) : cut).trim();
  }
  return v || slot.default;
}

/**
 * Fill a recipe's slots via Gemini. Returns repaired values + whether real output was used.
 * Never throws; returns recipe defaults if no API key / network / parse failure.
 */
export async function fillSlots(
  recipe: LayoutRecipe,
  profile: FillProfile,
  opts?: { model?: string; signal?: AbortSignal },
): Promise<FillResult> {
  const fallback: FillResult = { values: defaultSlotValues(recipe), filled: false };
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return fallback;
  const model = opts?.model || process.env.AI_PLAN_MODEL || "gemini-2.5-flash";
  const { system, user } = buildPrompt(recipe, profile);

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.5 },
      }),
      signal: opts?.signal ?? AbortSignal.timeout(20000),
    });
    if (!res.ok) return fallback;
    const j = await res.json();
    const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
    if (!text) return fallback;
    const obj = JSON.parse(stripFences(text));
    if (!obj || typeof obj !== "object") return fallback;

    const values: Record<string, string> = {};
    for (const slot of recipe.slots) values[slot.key] = repairValue(slot, (obj as any)[slot.key]);
    return { values, filled: true };
  } catch {
    return fallback;
  }
}

/** Convenience: fill + compose in one call. Returns the concrete section content (our shape). */
export async function generateSection(
  recipe: LayoutRecipe,
  profile: FillProfile,
  opts?: { model?: string; signal?: AbortSignal },
): Promise<{ content: Record<string, unknown>; filled: boolean }> {
  const { values, filled } = await fillSlots(recipe, profile, opts);
  return { content: composeSection(recipe, values), filled };
}
