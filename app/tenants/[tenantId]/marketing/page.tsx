import MarketingHub from "@/components/marketing/MarketingHub";
import { listCampaigns } from "@/lib/server/email-campaigns";
import { emailReady } from "@/lib/server/email-send";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * MARKETING (D-280): email campaigns end-to-end — AI-drafted, human-approved,
 * verified-sender-gated, guard-tag/DND exclusions always on. Social + SMS are
 * honest "Soon" tabs (designs in docs/GHL-PARITY.md).
 */
export default async function MarketingPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const [campaigns, ready] = await Promise.all([listCampaigns(tenantId), emailReady(tenantId)]);
  let tags: string[] = [];
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenant_tags").select("name").eq("tenant_id", tenantId).order("name");
    tags = (data ?? []).map((t: any) => String(t.name));
  } catch { /* empty registry */ }
  return <MarketingHub tenantId={tenantId} initialCampaigns={campaigns} status={{ emailReady: ready.ok, emailReason: ready.reason, tags }} />;
}
