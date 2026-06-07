import { v1PlanSchema, type V1Plan } from "./v1-format";
import { getBrandMemory } from "../design/brand-memory";

/**
 * Design/Quality critic (O-3, ratified). An adversarial pre-publish cohesion gate:
 * scores a website plan against brand memory + structural/UX/SEO/accessibility
 * heuristics, returning a verdict the supervisor can turn into a breakpoint. This is
 * the mechanism that enforces "immaculate" — no incoherent or off-brand experience
 * ships. It NEVER mutates; it only judges.
 *
 * Verdict -> supervisor mapping:
 *   blockers present  -> Reflection Inconsistency / Human Approval (halt)
 *   warnings only     -> pass with notes (proceed, surfaced in report)
 */

export type Severity = "blocker" | "warning" | "info";
export interface CriticIssue { code: string; severity: Severity; message: string; dimension: "brand" | "structure" | "seo" | "accessibility" | "ux"; }
export interface CriticVerdict {
  pass: boolean;
  score: number;          // 0–100
  issues: CriticIssue[];
  summary: string;
}

const SCORE_THRESHOLD = 70;

function collect(plan: V1Plan) {
  const sections = plan.actions.filter((a) => a.type === "createSection").map((a) => (a.params ?? {}) as Record<string, any>);
  const pages = plan.actions.filter((a) => a.type === "createPage");
  const nav = plan.actions.filter((a) => a.type === "updateNavigation");
  return { sections, pages, nav };
}

export async function critiquePlan(rawPlan: unknown): Promise<CriticVerdict> {
  const parsed = v1PlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { pass: false, score: 0, issues: [{ code: "INVALID_PLAN", severity: "blocker", message: "plan failed v1 schema", dimension: "structure" }], summary: "Plan is not a valid v1 website plan." };
  }
  const plan = parsed.data;
  const { sections, pages } = collect(plan);
  const issues: CriticIssue[] = [];
  const types = sections.map((s) => String(s.type ?? ""));

  // STRUCTURE — a premium page leads with a hero (single H1) and closes with a CTA.
  if (pages.length > 0 && !types.includes("hero")) issues.push({ code: "NO_HERO", severity: "blocker", message: "page has no hero — missing a clear H1/value proposition", dimension: "structure" });
  if (types.filter((t) => t === "hero").length > 1) issues.push({ code: "MULTI_HERO", severity: "warning", message: "multiple heroes — dilutes the single primary message / H1", dimension: "seo" });
  const hasCta = types.includes("cta") || types.includes("cta-banner") || sections.some((s) => s.primaryCta || s.cta);
  if (sections.length > 0 && !hasCta) issues.push({ code: "NO_CTA", severity: "warning", message: "no call-to-action — weak conversion path", dimension: "ux" });

  // CONTENT QUALITY — headings present and substantive.
  for (const s of sections) {
    const heading = s.heading ?? s.quote ?? "";
    if (s.type === "hero" && (!heading || String(heading).length < 8)) issues.push({ code: "WEAK_HEADING", severity: "warning", message: "hero heading is missing or too short to be compelling", dimension: "structure" });
  }

  // SEO — descriptive page slug + a content section beyond the hero.
  for (const p of pages) {
    const slug = String((p.params as any)?.slug ?? "");
    if (!slug || slug.length < 3) issues.push({ code: "WEAK_SLUG", severity: "warning", message: `page slug "${slug}" is not descriptive`, dimension: "seo" });
  }
  if (sections.length === 1 && types[0] === "hero") issues.push({ code: "THIN_PAGE", severity: "warning", message: "page is hero-only — thin content for SEO and trust", dimension: "seo" });

  // ACCESSIBILITY — form fields must have labels; media should have alt text.
  for (const s of sections) {
    if (Array.isArray(s.fields)) for (const f of s.fields) if (!f.label) issues.push({ code: "FIELD_NO_LABEL", severity: "blocker", message: `form field "${f.name ?? "?"}" has no label`, dimension: "accessibility" });
    if (s.media && typeof s.media === "object" && !(s.media as any).alt) issues.push({ code: "MEDIA_NO_ALT", severity: "warning", message: "media missing alt text", dimension: "accessibility" });
  }

  // BRAND — soft check that the plan isn't empty of brand-aligned CTAs/voice.
  try {
    const { memory } = await getBrandMemory(plan.tenantId);
    if (memory.voice.doNotUse.length) {
      const blob = JSON.stringify(sections).toLowerCase();
      for (const banned of memory.voice.doNotUse) if (banned && blob.includes(banned.toLowerCase())) issues.push({ code: "BRAND_BANNED_TERM", severity: "blocker", message: `uses a do-not-use brand term: "${banned}"`, dimension: "brand" });
    }
  } catch { /* brand memory optional */ }

  // SCORE — start at 100, subtract by severity.
  const penalty = issues.reduce((n, i) => n + (i.severity === "blocker" ? 25 : i.severity === "warning" ? 8 : 2), 0);
  const score = Math.max(0, 100 - penalty);
  const hasBlocker = issues.some((i) => i.severity === "blocker");
  const pass = !hasBlocker && score >= SCORE_THRESHOLD;

  const summary = pass
    ? `Quality gate PASSED (score ${score}/100${issues.length ? `, ${issues.length} note(s)` : ""}).`
    : `Quality gate ${hasBlocker ? "BLOCKED" : "below threshold"} (score ${score}/100): ${issues.filter((i) => i.severity === "blocker").map((i) => i.code).join(", ") || "score < " + SCORE_THRESHOLD}.`;

  return { pass, score, issues, summary };
}
