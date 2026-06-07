import SitePreviewDocument from "@/components/website/SitePreviewDocument";

interface EmbedProps {
  params: Promise<{ tenantId: string; pageId: string }>;
}

/**
 * Chrome-free page preview for thumbnails. Lives at the top level (NOT under the
 * tenant dashboard layout), so it renders ONLY the website page — no sidebar, no
 * dashboard menu. Used as the iframe source for the Pages-grid cards.
 */
export default async function WebsiteEmbedPage({ params }: EmbedProps) {
  const { tenantId, pageId } = await params;
  return <SitePreviewDocument tenantId={tenantId} pageId={pageId} embed />;
}
