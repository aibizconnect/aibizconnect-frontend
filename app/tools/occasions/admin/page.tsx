import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listAllAccounts, PAID_SITE_CAP } from "@/lib/server/occasion-widget-accounts";
import OccasionsAdmin from "./OccasionsAdmin";

/**
 * Occasions — staff admin panel. Manage the EXISTING GHL accounts: activate/suspend, switch
 * free/paid, set a custom per-account domain cap, and see which registered domains have actually
 * installed the snippet (last-seen heartbeat). Gated to platform admins (admin / superadmin) via
 * the same JWT/allowlist as the rest of /platform. This lives in the main app (not the GHL iframe),
 * so it uses the platform login, not the Occasions location token.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Occasions Admin — AIBizConnect", robots: { index: false } };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/tools/occasions/admin");
  if (!(await isPlatformAdmin())) redirect("/platform");

  const accounts = await listAllAccounts();
  return <OccasionsAdmin initialAccounts={accounts} paidCap={PAID_SITE_CAP} adminEmail={user.email} />;
}
