import type { Metadata } from "next";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { listIndustryTemplates } from "@/lib/design/templates";

export const metadata: Metadata = {
  title: "Build my site — AIBizConnect",
  description: "Answer three quick questions and our supervised AI generates your complete, on-brand website. Review and publish when you're ready.",
};

export default function StartPage() {
  const templates = listIndustryTemplates();
  return <OnboardingWizard templates={templates} />;
}
