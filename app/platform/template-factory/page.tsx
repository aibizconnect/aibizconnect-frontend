import { redirect } from "next/navigation";
import { getCurrentUser, isPlatformAdmin } from "@/lib/auth/platform-admin";
import { listSectionTemplates } from "@/lib/server/section-templates";
import TemplateFactory from "@/components/platform/TemplateFactory";

/** Section Template Factory — platform-admin console (D-363..367). Browse/seed/approve the shared
 *  section-template library and copy the Gemini-authored Stitch prompts. */
export default async function TemplateFactoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/platform/template-factory");
  if (!(await isPlatformAdmin())) redirect("/platform");
  const initial = await listSectionTemplates({ tenantId: null }).catch(() => []);
  return <TemplateFactory initial={initial} />;
}
