import { z } from "zod";
import { agentPlanSchema, type AgentPlan } from "./plan-schema";

/**
 * Builder-Agent v1.0 agent-facing plan contract (the authoritative format) +
 * a normalizer that translates it into the PROVEN internal AgentPlan that the
 * supervised execution engine already runs. The internal engine stays untouched;
 * this adapter is the only new surface (Path 1).
 *
 * Mapping notes (current schema reality):
 * - Sections are page-scoped (live in a page's draft_sections), so
 *   createSection + attachSectionToPage accumulate into ONE saveDraft per page.
 * - Blocks attach to pages (website_page_block_refs) -> attachBlockToPage.
 * - Publishing is intentionally NOT an agent action (human/supervised step).
 * - update and list actions are deferred in Path 1 (warned + skipped) until Path 2.
 */

export const V1_ACTION_TYPES = [
  "createPage", "updatePage", "createSection", "updateSection", "createBlock",
  "updateBlock", "attachSectionToPage", "attachBlockToPage", "updateNavigation",
  "listPages", "listSections", "listBlocks",
] as const;

export const DOMAINS = ["website", "social", "email", "ads", "chatbot", "voice"] as const;
export type Domain = (typeof DOMAINS)[number];

export const v1PlanSchema = z.object({
  version: z.literal("1.0"),
  domain: z.enum(DOMAINS).default("website"),
  tenantId: z.string().uuid(),
  dryRun: z.boolean(),
  actions: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(V1_ACTION_TYPES),
    params: z.record(z.string(), z.any()).default({}),
    ref: z.record(z.string(), z.string()).optional(),
  })).min(1).max(50),
});
export type V1Plan = z.infer<typeof v1PlanSchema>;

const toRef = (v?: string) => (v ? "$" + v : undefined); // "step.id" -> "$step.id"
const stepId = (v?: string) => (v ?? "").split(".")[0];

export function normalizeV1Plan(v1: V1Plan): { plan: AgentPlan; warnings: string[] } {
  const warnings: string[] = [];
  const internal: any[] = [];
  const sections = new Map<string, any>();      // section step id -> content
  const pageDrafts = new Map<string, any[]>();  // internal "$page.id" -> [content]
  const order: string[] = [];

  for (const a of v1.actions) {
    const p = (a.params ?? {}) as Record<string, any>;
    switch (a.type) {
      case "createPage":
        internal.push({ tool: "createPage", bind: a.id, args: { title: p.title, slug: p.slug, ...(p.isHome !== undefined ? { isHome: !!p.isHome } : {}) } });
        break;
      case "createBlock":
        internal.push({ tool: "createGlobalBlock", bind: a.id, args: { name: p.name, type: p.type, content: p.content ?? p } });
        break;
      case "createSection":
        sections.set(a.id, p.content ?? p); // section content object (flat)
        break;
      case "attachSectionToPage": {
        const content = sections.get(stepId(a.ref?.sectionId));
        const pageRef = toRef(a.ref?.pageId);
        if (!content || !pageRef) { warnings.push(`attachSectionToPage ${a.id}: unresolved ref`); break; }
        if (!pageDrafts.has(pageRef)) { pageDrafts.set(pageRef, []); order.push(pageRef); }
        pageDrafts.get(pageRef)!.push(content);
        break;
      }
      case "attachBlockToPage":
        internal.push({ tool: "attachBlockToPage", args: { pageId: toRef(a.ref?.pageId), blockId: toRef(a.ref?.blockId) } });
        break;
      case "updateNavigation":
        internal.push({ tool: "createNavItem", args: { menuKey: p.menuKey ?? "primary", kind: p.kind ?? "internal", target: a.ref?.pageId ? toRef(a.ref.pageId) : p.target } });
        break;
      default:
        warnings.push(`action type "${a.type}" is not mapped in Path 1 (skipped)`);
    }
  }
  for (const pageRef of order) {
    internal.push({ tool: "saveDraft", args: { pageId: pageRef, draft_sections: pageDrafts.get(pageRef) } });
  }
  const plan = agentPlanSchema.parse({ goal: "v1-plan", dryRun: v1.dryRun, actions: internal });
  return { plan, warnings };
}
