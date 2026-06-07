import SitePreviewDocument from "@/components/website/SitePreviewDocument";

interface PreviewPageProps {
  params: Promise<{ tenantId: string; pageId: string }>;
}

/** In-dashboard draft preview (shows the "Draft preview" banner). The chrome-free
 *  thumbnail version lives at /website-embed/[tenantId]/[pageId]. */
export default async function PreviewPage({ params }: PreviewPageProps) {
  const { tenantId, pageId } = await params;
  return <SitePreviewDocument tenantId={tenantId} pageId={pageId} />;
}
