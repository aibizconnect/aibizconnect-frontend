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

/** Map a tenant's public plans → pricing tiers. Returns [] when they have none (no fallback). */
export async function getTenantPlanTiers(tenantId: string): Promise<Tier[]> {
  let plans;
  try { plans = await listPlans(tenantId); } catch { return []; }
  const pub = plans.filter((p) => p.isActive && p.isPublic);
  if (pub.length === 0) return [];
  const anyFeatured = pub.some((p) => p.isFeatured);
  return pub.map((p, i, arr) => {
    const m = p.amountCents > 0 ? Math.round(p.amountCents / 100) : null;            // $0 ⇒ custom ("Call us")
    // Annual $/mo: discount kind wins (percent / amount / none), else explicit annual, else auto 20% off.
    let a: number | null = null;
    if (m !== null) {
      if (p.annualDiscountKind === "none") a = m;                                    // no annual option
      else if (p.annualDiscountKind === "percent" && p.annualDiscountValue) a = Math.max(0, Math.round(m * (1 - p.annualDiscountValue / 100)));
      else if (p.annualDiscountKind === "amount" && p.annualDiscountValue != null) a = Math.max(0, Math.round(m - p.annualDiscountValue));
      else if (p.annualAmountCents != null) a = Math.round(p.annualAmountCents / 100);
      else a = Math.round(m * 0.8);                                                  // auto 20% off
    }
    return {
      name: p.name,
      tagline: p.description ?? "",
      m, a,
      // CTA: tenant's label wins; else trial ⇒ "Start free", custom/$0 ⇒ "Contact sales", else "Get started".
      cta: (p.ctaLabel && p.ctaLabel.trim()) || (m === null ? "Contact sales" : p.trialDays > 0 ? "Start free" : "Get started"),
      href: (p.ctaHref && p.ctaHref.trim()) || (m === null ? "/contact" : "/start"),
      // Header: tenant's "include lower tier" toggle drives the "Everything in <lower>, plus" line.
      head: p.inheritLower && arr[i - 1] ? `Everything in ${arr[i - 1].name}, plus` : "Includes",
      feats: p.features,
      highlight: p.isFeatured || (!anyFeatured && i === 1),                          // explicit, else feature the 2nd tier
      trialDays: p.trialDays,
    };
  });
}

/** Public pricing for OUR marketing site — the platform tenant's plans, with the DEFAULT_TIERS
 *  fallback so aibizconnect.app is never blank. (Tenant sites use getTenantPlanTiers — no fallback.) */
export async function getPublicPricing(tenantId: string = PLATFORM_TENANT): Promise<Tier[]> {
  const tiers = await getTenantPlanTiers(tenantId);
  return tiers.length ? tiers : DEFAULT_TIERS;
}
