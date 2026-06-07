import WebsiteLearnDemo from "@/components/sites/WebsiteLearnDemo";

export default async function LearnPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <WebsiteLearnDemo tenantId={tenantId} />;
}
