"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Tenant-level External Tracking (the market-leading platform parity). These are DEFAULTS applied across ALL of the
 * tenant's published sites — a per-website override (set in the website editor's Site Settings, stored
 * in theme.site) always wins. Stored as key/value in tenant_settings. Admin-gated writes.
 */

const KEYS = {
  ga4: "track_ga4_id",
  gtm: "track_gtm_id",
  pixel: "track_meta_pixel_id",
  head: "track_head_scripts",
  footer: "track_footer_scripts",
} as const;

export interface TrackingSettings {
  ga4Id: string;
  gtmId: string;
  metaPixelId: string;
  headScripts: string;
  footerScripts: string;
}

/** SERVER-ONLY helper: read the tenant tracking defaults (used by the public site as a fallback). */
export async function getTenantTrackingDefaults(tenantId: string): Promise<Partial<TrackingSettings>> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_settings")
    .select("setting_key, setting_value")
    .eq("tenant_id", tenantId)
    .in("setting_key", Object.values(KEYS));
  const m = new Map((data ?? []).map((r: any) => [r.setting_key, r.setting_value ? String(r.setting_value) : ""]));
  return {
    ga4Id: m.get(KEYS.ga4) || undefined,
    gtmId: m.get(KEYS.gtm) || undefined,
    metaPixelId: m.get(KEYS.pixel) || undefined,
    headScripts: m.get(KEYS.head) || undefined,
    footerScripts: m.get(KEYS.footer) || undefined,
  };
}

export async function getTracking(tenantId: string): Promise<TrackingSettings> {
  await requireTenantAccess(tenantId);
  const d = await getTenantTrackingDefaults(tenantId);
  return {
    ga4Id: d.ga4Id ?? "", gtmId: d.gtmId ?? "", metaPixelId: d.metaPixelId ?? "",
    headScripts: d.headScripts ?? "", footerScripts: d.footerScripts ?? "",
  };
}

export async function saveTracking(tenantId: string, t: TrackingSettings): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) return { ok: false, message: "Not authorized — admin only." };

  const ga4 = (t.ga4Id || "").trim();
  if (ga4 && !/^G-[A-Z0-9]+$/i.test(ga4)) return { ok: false, message: "GA4 Measurement ID looks like G-XXXXXXXX." };
  const gtm = (t.gtmId || "").trim();
  if (gtm && !/^GTM-[A-Z0-9]+$/i.test(gtm)) return { ok: false, message: "GTM Container ID looks like GTM-XXXXXX." };

  const now = new Date().toISOString();
  const rows = [
    { setting_key: KEYS.ga4, setting_value: ga4 },
    { setting_key: KEYS.gtm, setting_value: gtm },
    { setting_key: KEYS.pixel, setting_value: (t.metaPixelId || "").trim() },
    { setting_key: KEYS.head, setting_value: (t.headScripts || "").trim() },
    { setting_key: KEYS.footer, setting_value: (t.footerScripts || "").trim() },
  ].map((r) => ({ tenant_id: tenantId, ...r, updated_at: now }));

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_settings").upsert(rows, { onConflict: "tenant_id,setting_key" });
  if (error) return { ok: false, message: error.message };
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action: "tracking.save", actorEmail: await getCurrentUserEmail(), meta: { tenantId } });
  } catch { /* best effort */ }
  return { ok: true };
}
