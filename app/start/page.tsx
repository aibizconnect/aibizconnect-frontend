import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/platform-admin";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";

export const metadata: Metadata = {
  title: "Tell us about your business — AIBizConnect",
  description: "Paste your website or social handle. Our AI generates your site, shop, lead funnels and social posts — ready to launch.",
};

/**
 * /start — public-facing Welcome (Claude Design handoff). Renders the product-entry hero. It does
 * NOT provision anything anonymously (D-378 spine): the entered site/handle is carried as `seed`
 * into sign-up → /onboarding. Already-signed-in visitors go straight to /onboarding from the CTA.
 */
export default async function StartPage() {
  const user = await getCurrentUser();
  return (
    <div className="abc-ds">
      <WelcomeScreen authed={!!user} />
    </div>
  );
}
