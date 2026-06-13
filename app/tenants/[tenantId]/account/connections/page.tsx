import Link from "next/link";
import ConnectionsHub from "@/components/account/ConnectionsHub";
import { listConnectionsAction } from "./actions";

export default async function ConnectionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  let initial: Awaited<ReturnType<typeof listConnectionsAction>> = [];
  try { initial = await listConnectionsAction(tenantId); } catch { /* migration 0063 not applied yet */ }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/account`} className="text-slate-400 hover:text-slate-700">Account</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Connections</span>
      </div>
      <ConnectionsHub tenantId={tenantId} initial={initial} />
    </div>
  );
}
