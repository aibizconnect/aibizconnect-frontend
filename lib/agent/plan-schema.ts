import { z } from "zod";

/**
 * Agent Execution Plan schema (Cycle 3/4). Whitelisted tools ONLY — anything
 * else is rejected. Tool arg shapes match the REAL server-action signatures in
 * app/tenants/[tenantId]/website/actions.ts (verified), NOT an idealized form.
 */

export const MAX_ACTIONS = 50; // reject plans with more than 50 actions
export const MAX_REF_DEPTH = 5; // max passes when resolving "$name.id" chains

const uuid = z.string().uuid();
// $ref to a prior step's bound output, e.g. "$home.id"
const ref = z.string().regex(/^\$[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+$/);
const idOrRef = z.union([uuid, ref]);

export const agentAction = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("createPage"),
    bind: z.string().min(1), // required so later steps can $ref the new id
    args: z.object({
      title: z.string().min(1),
      slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      isHome: z.boolean().optional(),
    }),
  }),
  z.object({
    tool: z.literal("saveDraft"),
    args: z.object({
      pageId: idOrRef,
      draft_title: z.string().optional(),
      draft_slug: z.string().optional(),
      draft_seo: z.record(z.string(), z.any()).optional(),
      draft_sections: z.array(z.any()).optional(),
    }),
  }),
  z.object({
    tool: z.literal("createGlobalBlock"),
    bind: z.string().min(1),
    args: z.object({ name: z.string().min(1), type: z.string().min(1), content: z.any() }),
  }),
  z.object({
    tool: z.literal("attachBlockToPage"),
    args: z.object({ pageId: idOrRef, blockId: idOrRef }),
  }),
  z.object({
    tool: z.literal("createNavItem"),
    args: z.object({
      menuKey: z.string().default("primary"),
      kind: z.enum(["internal", "external"]),
      target: z.string().min(1), // pageId(ref) for internal, url for external
    }),
  }),
  z.object({ tool: z.literal("publishGlobalBlock"), args: z.object({ blockId: idOrRef }) }),
  z.object({ tool: z.literal("publishNavItem"), args: z.object({ itemId: idOrRef }) }),
  z.object({ tool: z.literal("publishPage"), args: z.object({ pageId: idOrRef }) }),
]);

export type AgentAction = z.infer<typeof agentAction>;

export const agentPlanSchema = z.object({
  goal: z.string().optional(),
  dryRun: z.boolean().default(true), // SAFE DEFAULT: dry-run unless explicitly false
  actions: z.array(agentAction).min(1).max(MAX_ACTIONS),
});

export type AgentPlan = z.infer<typeof agentPlanSchema>;
