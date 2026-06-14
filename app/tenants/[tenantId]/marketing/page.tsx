import MarketingHub from "@/components/marketing/MarketingHub";
import { listCampaigns } from "@/lib/server/email-campaigns";
import { emailReady } from "@/lib/server/email-send";
import { twilioReady } from "@/lib/server/twilio";
import { listSocialAccounts, type SocialAccountView } from "@/lib/server/social";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * MARKETING (D-280, D-344): Email + SMS campaigns, Templates, Trigger Links, and the
 * Social Planner (compose → schedule → publish to FB/IG/LinkedIn). AI-drafted, human-approved,
 * verified-sender-gated, guard-tag/DND exclusions always on; nothing posts/sends unless you do.
 */
export default async function MarketingPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const [campaigns, ready, sms, socialAccounts] = await Promise.all([
    listCampaigns(tenantId), emailReady(tenantId), twilioReady(tenantId).catch(() => false),
    listSocialAccounts(tenantId, { postableOnly: true }).catch((): SocialAccountView[] => []),
  ]);
  let tags: string[] = [];
  try {
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenant_tags").select("name").eq("tenant_id", tenantId).order("name");
    tags = (data ?? []).map((t: any) => String(t.name));
  } catch { /* empty registry */ }
  return <MarketingHub tenantId={tenantId} initialCampaigns={campaigns} status={{ emailReady: ready.ok, emailReason: ready.reason, smsReady: sms, tags }} socialAccounts={socialAccounts} />;
}
