import { llm, stripFences } from "./llm";
import { getDomainSpec } from "./domains/registry";
import { brandContextForPrompt, type BrandMemory } from "../design/brand-memory";

/**
 * Model-driven per-domain planners (DL-1 follow-on, ratified next-phase (a)).
 * Each planner asks the LLM for a v1 plan scoped to ONE domain's action whitelist,
 * injects shared brand context (M-3) for cohesion, validates the result against the
 * domain's DomainSpec, and falls back to a deterministic brand-aware template if the
 * model is unavailable or returns something invalid (L-3 — provenance always tagged).
 *
 * Safety unchanged: these only PLAN (dryRun:true). Gated actions (send/publish) stay
 * G-gated at execute time; live stays blocked until each domain's conditions are met.
 */

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

function emailTemplate(tenantId: string, goal: string, brand: BrandMemory) {
  const subject = clip(goal, 60) || "An update from our team";
  const tone = brand.voice.tone[0] ?? "professional";
  return {
    version: "1.0", domain: "email", tenantId, dryRun: true,
    actions: [
      { id: "tpl", type: "createTemplate", params: { name: clip(goal, 40) || "Campaign", subject, html: `<h1>${subject}</h1><p>(${tone} tone, on-brand)</p>` } },
      { id: "draft", type: "draftCampaign", params: { subject, audience: "subscribers" }, ref: { templateRef: "tpl.id" } },
    ],
  };
}

function socialTemplate(tenantId: string, goal: string) {
  const body = clip(goal, 200) || "Big news coming soon.";
  return {
    version: "1.0", domain: "social", tenantId, dryRun: true,
    actions: ["linkedin", "x"].map((platform, i) => ({
      id: `post-${platform}`, type: "createPostDraft",
      params: { platform, body: i === 0 ? body : clip(body, 240) },
    })),
  };
}

const EMAIL_SYSTEM = `You are the Email Builder-Agent. Produce ONLY a JSON v1 plan for the EMAIL domain.
Allowed action types: createTemplate { name, subject, html }, draftCampaign { subject, audience }.
draftCampaign may ref a template via "ref": { "templateRef": "<createTemplateStepId>.id" }.
Rules: tenant-scoped; on-brand; compelling subject; concise benefit-led body; NEVER include a send action; output ONLY JSON: { "version":"1.0","domain":"email","tenantId":"...","dryRun":true,"actions":[...] }.`;

const SOCIAL_SYSTEM = `You are the Social Builder-Agent. Produce ONLY a JSON v1 plan for the SOCIAL domain.
Allowed action types: createPostDraft { platform, body }, schedulePost { postRef, when }.
platform must be one of: x, linkedin, facebook, instagram. Rules: tenant-scoped; on-brand voice; platform-appropriate length; NEVER include publishPost; output ONLY JSON: { "version":"1.0","domain":"social","tenantId":"...","dryRun":true,"actions":[...] }.`;

async function modelPlan(domain: "email" | "social", system: string, tenantId: string, goal: string, brand: BrandMemory): Promise<unknown | null> {
  const user = `tenantId: ${tenantId}\nGoal: ${goal}\nBrand: ${brandContextForPrompt(brand)}\nReturn the JSON plan now.`;
  const raw = await llm.complete({ system, user, jsonObject: true, model: "gpt-4o-mini" }, tenantId);
  if (!raw) return null;
  try {
    const obj = JSON.parse(stripFences(raw));
    const candidate = { ...obj, version: "1.0", domain, tenantId, dryRun: true };
    const spec = getDomainSpec(domain);
    if (spec && spec.validate(candidate).ok) return candidate;
    return null;
  } catch {
    return null;
  }
}

export async function planEmail(tenantId: string, goal: string, brand: BrandMemory): Promise<{ plan: unknown; source: "llm" | "template" }> {
  const m = await modelPlan("email", EMAIL_SYSTEM, tenantId, goal, brand);
  return m ? { plan: m, source: "llm" } : { plan: emailTemplate(tenantId, goal, brand), source: "template" };
}

export async function planSocial(tenantId: string, goal: string, brand: BrandMemory): Promise<{ plan: unknown; source: "llm" | "template" }> {
  const m = await modelPlan("social", SOCIAL_SYSTEM, tenantId, goal, brand);
  return m ? { plan: m, source: "llm" } : { plan: socialTemplate(tenantId, goal), source: "template" };
}
