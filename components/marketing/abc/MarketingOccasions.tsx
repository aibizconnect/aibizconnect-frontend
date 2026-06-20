import { getSiteSettings } from "@/app/tenants/[tenantId]/website/actions";
import { PLATFORM_TENANT } from "@/lib/marketing/pricing";
import SiteOccasions from "@/components/site/SiteOccasions";

/**
 * Renders the active occasion (holiday/custom banner + ambient animation) on the AIBizConnect
 * MARKETING site (aibizconnect.app). The hand-coded marketing pages don't go through the
 * section-model renderer, so without this the Occasions feature (Sites → Occasions) had nothing
 * to display here. Reads the platform tenant's occasions config, so toggling an occasion in the
 * dashboard shows on the live site. Best-effort — never breaks the page.
 */
export default async function MarketingOccasions() {
  try {
    const settings = await getSiteSettings(PLATFORM_TENANT);
    return settings?.occasions ? <SiteOccasions config={settings.occasions} /> : null;
  } catch {
    return null;
  }
}
