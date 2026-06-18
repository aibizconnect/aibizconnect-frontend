import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { listIndustryTemplates } from "@/lib/design/templates";
import { getCurrentUser } from "@/lib/auth/platform-admin";

export const metadata = {
  title: "Create your workspace — AIBizConnect",
  description: "Tell us about your business and we'll set up your workspace — website, CRM, and tools.",
};

/**
 * Authenticated create-workspace step (D-378/379). A signed-in user with no tenant lands here from
 * /home and creates THEIR workspace (tied to their account) → Genesis sets up the core → Launchpad.
 * This is the real onboarding spine; /start is just a public funnel into it.
 */
export default async function OnboardingPage({ searchParams }: { searchParams?: Promise<{ seed?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/onboarding");
  const templates = listIndustryTemplates();
  const seed = (await searchParams)?.seed;
  return <OnboardingWizard templates={templates} defaultEmail={user.email} authed seed={seed} />;
}
