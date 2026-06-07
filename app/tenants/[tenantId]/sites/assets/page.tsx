import SavedAssetsLibrary from "@/components/sites/SavedAssetsLibrary";
import { listAssetsAction } from "../asset-actions";

export default async function AssetsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const initial = await listAssetsAction(tenantId);
  return <SavedAssetsLibrary tenantId={tenantId} initial={initial} />;
}
