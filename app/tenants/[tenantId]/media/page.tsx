import MediaManager from "@/components/media/MediaManager";

/** Media Storage — dashboard-level Media Library for the tenant. */
export default async function MediaPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <MediaManager tenantId={tenantId} />;
}
