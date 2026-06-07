"use client";

import MediaLibraryRoot from "./MediaLibraryRoot";

/** Dashboard "Media Storage" page — the shared library in manage mode. */
export default function MediaManager({ tenantId }: { tenantId: string }) {
  return <MediaLibraryRoot tenantId={tenantId} mode="manage" />;
}
