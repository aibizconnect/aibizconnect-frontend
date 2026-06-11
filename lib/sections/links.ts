import { z } from "zod";

/**
 * Shared link model (D-222, Gemini + Copilot ratified): every clickable in the system — menu and
 * submenu items, buttons, list items, the floating text popup's link control — stores WHERE it
 * goes the same way. The LinkEditor manages kind/pageId/url/anchor; `href` is the MATERIALIZED
 * destination (written whenever the link is set), so renderers stay dumb: they emit href+target
 * and never resolve pages themselves.
 */
export const linkValueSchema = z.object({
  kind: z.enum(["page", "url", "anchor"]).default("url"),
  pageId: z.string().optional(), // kind "page": website_pages.id — LinkEditor materializes href from the slug
  url: z.string().optional(),    // kind "url": external or full destination
  anchor: z.string().optional(), // kind "anchor": a section anchor on the current page (stored without '#')
  href: z.string().optional(),   // materialized destination — what renderers actually emit
  target: z.enum(["_self", "_blank"]).optional(),
});
export type LinkValue = z.infer<typeof linkValueSchema>;

/** The href+target a renderer should emit for a LinkValue (or a legacy plain href string). */
export function resolveLink(link?: LinkValue | string | null): { href?: string; target?: "_self" | "_blank" } {
  if (!link) return {};
  if (typeof link === "string") return link && link !== "#" ? { href: link } : {};
  const href = link.href
    || (link.kind === "anchor" && link.anchor ? `#${link.anchor.replace(/^#/, "")}` : undefined)
    || (link.kind === "url" ? link.url : undefined);
  return href ? { href, target: link.target } : {};
}

/** Back-compat lift: a legacy plain href string becomes a LinkValue ('#'/empty → no link). */
export function linkFromHref(href?: string | null, target?: "_self" | "_blank"): LinkValue | undefined {
  const h = (href || "").trim();
  if (!h || h === "#") return undefined;
  if (h.startsWith("#")) return { kind: "anchor", anchor: h.slice(1), href: h, ...(target ? { target } : {}) };
  return { kind: "url", url: h, href: h, ...(target ? { target } : {}) };
}
