/**
 * AI Website Generator — v1 (Path B, ratified by Copilot).
 *
 * A DRAFT-ONLY layer on top of the existing Builder-Agent. It reuses generatePlan()
 * (the same brain the supervised pipeline uses) but, instead of going through
 * /api/agent/execute, it parses the v1 plan into a human-reviewable site preview and
 * (on confirm) writes ONLY createPage + saveDraft. It NEVER publishes, never mutates
 * nav/global settings, never touches production. The supervised executor stays the
 * "pro" path and is left completely untouched.
 *
 * Guardrails (Copilot's ruling): draft-only hard-coded + a lightweight pre-commit sanity
 * filter (max pages, max sections/page, reject empty/garbage plans, known section types).
 */
import type { V1Plan } from "./v1-format";
import { sectionTypes } from "@/lib/sections/schemas";

const SECTION_TYPES = new Set<string>(sectionTypes as unknown as string[]);
const stepId = (v?: string) => (v ?? "").split(".")[0];

export interface SitePreviewSection { type: string; heading?: string; content: Record<string, unknown> }
export interface SitePreviewPage { title: string; slug: string; isHome: boolean; sections: SitePreviewSection[] }
export interface SitePreview { pages: SitePreviewPage[]; warnings: string[]; source?: string }

/** Pull a short, human label from a section's content for the preview outline. */
function headingOf(content: Record<string, unknown>): string | undefined {
  return (content.heading as string) || (content.text as string) || (content.title as string) || undefined;
}

/** Parse a v1 plan into a reviewable page/section outline (no DB writes). */
export function planToSitePreview(v1: V1Plan): SitePreview {
  const warnings: string[] = [];
  const sections = new Map<string, Record<string, unknown>>();
  const pages = new Map<string, SitePreviewPage>();
  const order: string[] = [];

  for (const a of v1.actions) {
    const p = (a.params ?? {}) as Record<string, unknown>;
    if (a.type === "createPage") {
      pages.set(a.id, { title: (p.title as string) || "Untitled", slug: (p.slug as string) || "", isHome: !!p.isHome, sections: [] });
      order.push(a.id);
    } else if (a.type === "createSection") {
      sections.set(a.id, (p.content as Record<string, unknown>) ?? p);
    } else if (a.type === "attachSectionToPage") {
      const content = sections.get(stepId(a.ref?.sectionId));
      const page = pages.get(stepId(a.ref?.pageId));
      if (!content || !page) { warnings.push(`Skipped an unresolved section link (${a.id}).`); continue; }
      const type = String(content.type ?? "");
      if (!SECTION_TYPES.has(type)) { warnings.push(`Skipped section of unknown type "${type}".`); continue; }
      page.sections.push({ type, heading: headingOf(content), content });
    }
  }
  const list = order.map((id) => pages.get(id)!).filter(Boolean);
  return { pages: list, warnings };
}

export interface SanityLimits { maxPages?: number; maxSectionsPerPage?: number }

/**
 * Pre-commit sanity filter (Guardrail 2). Caps page/section counts, drops empty pages,
 * and rejects an obviously empty/garbage plan. Returns the trimmed preview + notes.
 * Throws only when there is nothing usable to write.
 */
export function sanitizeForDraft(preview: SitePreview, limits?: SanityLimits): { pages: SitePreviewPage[]; notes: string[] } {
  const maxPages = limits?.maxPages ?? 10;
  const maxSections = limits?.maxSectionsPerPage ?? 12;
  const notes: string[] = [];

  let pages = preview.pages.filter((pg) => pg.sections.length > 0);
  if (pages.length === 0) throw new Error("The generated plan had no usable pages — try a more descriptive brief.");

  if (pages.length > maxPages) { notes.push(`Capped to ${maxPages} pages (plan had ${pages.length}).`); pages = pages.slice(0, maxPages); }
  pages = pages.map((pg) => {
    if (pg.sections.length > maxSections) { notes.push(`"${pg.title}" capped to ${maxSections} sections.`); return { ...pg, sections: pg.sections.slice(0, maxSections) }; }
    return pg;
  });
  // Ensure exactly one home page (first one wins if none/many flagged).
  if (!pages.some((pg) => pg.isHome)) { pages[0].isHome = true; notes.push(`Marked "${pages[0].title}" as the home page.`); }
  return { pages, notes };
}
