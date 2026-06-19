import { listPlans } from "@/lib/server/subscriptions";
import { DEFAULT_TIERS, type Tier } from "./pricing-tiers";

/**
 * Public pricing = single source of truth. The home + /pricing pages render from the platform
 * tenant's `subscription_plans` (edited in Payments → Subscriptions), so changing a level there
 * updates the website. Read per request (pages are server-rendered) so edits show immediately;
 * falls back to DEFAULT_TIERS if the table is empty/unreachable so the public site is never blank.
 */

export const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
export type { Tier } from "./pricing-tiers";

async function build(tenantId: string): Promise<Tier[]> {
  let plans;
  try { plans = await listPlans(tenantId); } catch { return DEFAULT_TIERS; }
  const pub = plans.filter((p) => p.isActive && p.isPublic);
  if (pub.length === 0) return DEFAULT_TIERS;
  const anyFeatured = pub.some((p) => p.isFeatured);
  return pub.map((p, i, arr) => {
    const m = p.amountCents > 0 ? Math.round(p.amountCents / 100) : null;            // $0 ⇒ custom ("Call us")
    const a = p.annualAmountCents != null ? Math.round(p.annualAmountCents / 100)    // explicit annual…
      : m !== null ? Math.round(m * 0.8) : null;                                     // …else 20% off
    return {
      name: p.name,
      tagline: p.description ?? "",
      m, a,
      cta: p.ctaLabel ?? (m === null ? "Contact sales" : "Start free"),
      href: p.ctaHref ?? (m === null ? "/contact" : "/start"),
      head: i === 0 ? "Includes" : `Everything in ${arr[i - 1].name}, plus`,
      feats: p.features,
      highlight: p.isFeatured || (!anyFeatured && i === 1),                          // explicit, else feature the 2nd tier
    };
  });
}

/** Public pricing for a tenant (defaults to the platform tenant = aibizconnect.app). */
export function getPublicPricing(tenantId: string = PLATFORM_TENANT): Promise<Tier[]> {
  return build(tenantId);
}
