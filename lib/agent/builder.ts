import { v1PlanSchema, type V1Plan } from "./v1-format";
import { getAgent, ROLE_PROMPTS } from "./registry";
import { getBrandMemory, brandContextForPrompt } from "../design/brand-memory";

/**
 * Builder-Agent v2 — goal → v1.0 plan (the "brain").
 *
 * Emits the authoritative v1.0 plan contract. The plan is then submitted to
 * /api/agent/execute, which normalizes it to the internal engine and runs it
 * under the supervisor. Generated plans are forced dryRun:true (safety) — live
 * execution is a separate explicit, supervised step.
 */

const SYSTEM = `You are the Builder-Agent for a multi-tenant website builder platform.
Your ONLY job is to generate a structured multi-action PLAN from a user goal.
You NEVER execute actions. You NEVER mutate data. You NEVER call tools.
You ONLY produce a JSON plan that the Supervisor and Execution Engine will validate and run.

PLAN FORMAT (STRICT):
{ "version":"1.0", "tenantId":"<tenant-id>", "dryRun": true, "actions":[ { "id":"unique-step-id", "type":"<actionType>", "params":{...}, "ref":{...} } ] }

ALLOWED ACTION TYPES (whitelist):
createPage, updatePage, createSection, updateSection, createBlock, updateBlock, attachSectionToPage, attachBlockToPage, updateNavigation, listPages, listSections, listBlocks

PARAMS:
- createPage.params: { "title":string, "slug":"lowercase-hyphen", "isHome"?:boolean }
- createSection.params: a flat section content object, one of:
  { "type":"hero","heading":string,"subheading"?:string,"primaryCta"?:{"label":string,"href":string} }
  { "type":"features","heading":string,"features":[{"title":string,"description":string}] }
  { "type":"testimonials","heading":string,"items":[{"name":string,"role"?:string,"quote":string}] }
  { "type":"pricing","heading":string,"plans":[{"title":string,"price":string,"features"?:[string]}] }
  { "type":"faq","heading":string,"items":[{"q":string,"a":string}] }
  { "type":"cta","heading":string,"subheading"?:string,"cta":{"label":string,"href":string} }
  { "type":"heading","text":string,"level"?:"h2"|"h3" }
  { "type":"text","text":string }
  { "type":"contact-form","heading":string,"fields":[{"name":string,"label":string,"type":"text"|"email"|"tel"|"textarea"}],"submitLabel":string }
- createBlock.params: { "name":string, "type":<sectionType>, "content":<section content object> }
- attachSectionToPage.ref: { "sectionId":"<createSectionStepId>.id", "pageId":"<createPageStepId>.id" }
- attachBlockToPage.ref: { "blockId":"<createBlockStepId>.id", "pageId":"<createPageStepId>.id" }
- updateNavigation: { "params":{"menuKey":"primary","kind":"internal"}, "ref":{"pageId":"<step>.id"} }

FULL-WEBSITE GUIDANCE (when the goal asks for a website / multiple pages / a full site):
- Generate a COHESIVE 5–6 page site. Recommended pages & sections:
  • Home (isHome:true): hero -> features -> testimonials -> cta
  • About: heading -> text -> features
  • Services (or the business's core offering): heading -> features -> cta
  • Pricing: pricing -> faq
  • Contact: heading -> contact-form
  • (optional) Gallery/Portfolio or Blog landing if it fits the business
- Each page = ONE createPage + its createSection steps + one attachSectionToPage per section (in order).
- Mark exactly ONE page isHome:true (Home). Slugs: home->"home" (or isHome), others lowercase-hyphen.
- Add an updateNavigation step per page so they appear in the primary menu, in logical order.
- Write REAL, specific copy for the business/industry in the goal (no lorem ipsum, no placeholders).
- Do NOT include image URLs — the user wires images from the Media Library; omit image sections unless asked.

RULES:
1. Tenant-scoped. 2. NEVER invent IDs — use ref to chain step outputs ("<stepId>.id"). 3. NEVER reference another tenant. 4. NEVER unknown fields/types. 5. No destructive actions. 6. No schema drift. 7. Output ONLY JSON — no prose. 8. Deterministic and safe; minimal ONLY when the goal is a single page. 9. Valid JSON, no trailing commas. 10. Executable by the supervised engine.

Return ONLY the JSON plan.`;

export interface GeneratePlanResult {
  plan: V1Plan | null;
  source: "llm" | "fallback" | "stub";
  role: string;
  domain: string;
  error?: string;
}

const stripFences = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
const slugify = (s: string) => (s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)) || "home";

/** Deterministic minimal v1 plan so goal→plan→execute works without an LLM key. */
function fallbackPlan(goal: string, tenantId: string): V1Plan {
  return v1PlanSchema.parse({
    version: "1.0",
    tenantId,
    dryRun: true,
    actions: [
      { id: "page", type: "createPage", params: { title: goal.slice(0, 60) || "New Page", slug: slugify(goal) } },
      { id: "hero", type: "createSection", params: { type: "hero", heading: goal.slice(0, 80) || "Welcome" } },
      { id: "attach-hero", type: "attachSectionToPage", params: {}, ref: { sectionId: "hero.id", pageId: "page.id" } },
    ],
  });
}

/** Gemini fallback for the planner (uses the GEMINI_API_KEY already in this process).
 *  Returns the parsed plan object or null; never throws. JSON-forced via responseMimeType. */
async function tryGeminiPlan(system: string, user: string, _tenantId: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AI_PLAN_MODEL || "gemini-2.5-flash";
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
    if (!text) return null;
    return JSON.parse(stripFences(text));
  } catch {
    return null;
  }
}

export async function generatePlan(args: { tenantId: string; role: string; goal: string }): Promise<GeneratePlanResult> {
  const { tenantId, goal } = args;
  const agent = getAgent(args.role) ?? getAgent("website.editor")!;
  const role = agent.role;
  const domain = agent.domain;

  // Only the website domain has a plan schema today. Other domains are registered
  // but have no generator yet — return a stub result (the execute endpoint would
  // also BLOCK them). Honest, not hallucinated.
  if (domain !== "website") {
    return { plan: null, source: "stub", role, domain, error: `role "${role}" (domain "${domain}") has no plan schema yet — implement the ${domain} domain first` };
  }

  // Shared brand/design memory (M-3) — every website role plans against one source
  // of brand truth for cohesion. Degrades to house defaults if memory is unavailable.
  const { memory } = await getBrandMemory(tenantId);
  const brandContext = brandContextForPrompt(memory);

  const system = SYSTEM
    + (ROLE_PROMPTS[role] ? `\n\nROLE FOCUS (${role}): ${ROLE_PROMPTS[role]}` : "")
    + `\n\nBRAND CONTEXT (honor for cohesion): ${brandContext}`;
  const userMsg = `tenantId: ${tenantId}\nGoal: ${goal}\nReturn the JSON plan now.`;
  const key = process.env.OPENAI_API_KEY;

  // No OpenAI key in this (frontend) process? Use Gemini if its key is present here — it
  // already powers the image features — so generation works without OpenAI. OpenAI stays
  // the primary path (unchanged); this is a pure fallback before the deterministic plan.
  if (!key) {
    const gem = await tryGeminiPlan(system, userMsg, tenantId);
    if (gem) {
      const valid = v1PlanSchema.safeParse({ ...gem, version: "1.0", domain: "website", tenantId, dryRun: true });
      if (valid.success) return { plan: valid.data, source: "llm", role, domain };
    }
    return { plan: fallbackPlan(goal, tenantId), source: "fallback", role, domain, error: "No OPENAI_API_KEY (and no usable Gemini plan) — deterministic fallback" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.3, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `tenantId: ${tenantId}\nGoal: ${goal}\nReturn the JSON plan now.` },
        ],
      }),
    });
    if (!res.ok) return { plan: fallbackPlan(goal, tenantId), source: "fallback", role, domain, error: `OpenAI ${res.status}` };
    const j = await res.json();
    const obj = JSON.parse(stripFences(j.choices?.[0]?.message?.content ?? ""));
    const candidate = { ...obj, version: "1.0", domain: "website", tenantId, dryRun: true };
    const valid = v1PlanSchema.safeParse(candidate);
    if (!valid.success) return { plan: fallbackPlan(goal, tenantId), source: "fallback", role, domain, error: "LLM plan failed v1 schema validation" };
    return { plan: valid.data, source: "llm", role, domain };
  } catch (e: unknown) {
    return { plan: fallbackPlan(goal, tenantId), source: "fallback", role, domain, error: (e as Error).message };
  }
}
