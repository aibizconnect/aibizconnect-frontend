import AutomationBuilder from "@/components/crm/AutomationBuilder";

export default async function AutomationCreatePage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return <AutomationBuilder tenantId={tenantId} />;
}
