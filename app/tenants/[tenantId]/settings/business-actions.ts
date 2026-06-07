"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";

/**
 * Business Profile (tenant-level identity). Optimized parity with the market-leading platform's Business Profile:
 * general info + physical address + locale. Stored as key/value rows in tenant_settings (the same
 * store Preferences + the Launchpad "account" step already read), so `currency` and
 * `default_timezone` stay in sync across the app. Admin-gated writes; tenant-scoped reads.
 */

const FIELDS = [
  "business_name",        // friendly / display name
  "legal_business_name",
  "business_email",
  "business_phone",
  "business_website",
  "business_niche",
  "currency",             // shared with Preferences
  "address_street",
  "address_city",
  "address_postal",
  "address_state",
  "address_country",
  "default_timezone",     // shared with Preferences
  "platform_language",
] as const;

export type BusinessProfile = Record<(typeof FIELDS)[number], string>;

export async function getBusinessProfile(tenantId: string): Promise<BusinessProfile> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("tenant_settings")
    .select("setting_key, setting_value")
    .eq("tenant_id", tenantId)
    .in("setting_key", FIELDS as unknown as string[]);
  const out = Object.fromEntries(FIELDS.map((f) => [f, ""])) as BusinessProfile;
  for (const r of (data ?? []) as any[]) {
    if (r.setting_value != null) out[r.setting_key as keyof BusinessProfile] = String(r.setting_value);
  }
  return out;
}

export async function saveBusinessProfile(
  tenantId: string,
  patch: Partial<BusinessProfile>,
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) return { ok: false, message: "Not authorized — admin only." };

  // Light validation (non-blocking on empties; user may save partial).
  const email = (patch.business_email ?? "").trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Business email looks invalid." };
  const website = (patch.business_website ?? "").trim();
  if (website && !/^https?:\/\/.+/i.test(website)) return { ok: false, message: "Website should start with http:// or https://" };

  const now = new Date().toISOString();
  const rows = (Object.keys(patch) as (keyof BusinessProfile)[])
    .filter((k) => (FIELDS as readonly string[]).includes(k))
    .map((k) => ({ tenant_id: tenantId, setting_key: k, setting_value: (patch[k] ?? "").trim(), updated_at: now }));
  if (rows.length === 0) return { ok: true };

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tenant_settings").upsert(rows, { onConflict: "tenant_id,setting_key" });
  if (error) return { ok: false, message: error.message };

  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action: "business_profile.save", actorEmail: await getCurrentUserEmail(), meta: { tenantId, fields: rows.map((r) => r.setting_key) } });
  } catch { /* best effort */ }
  return { ok: true };
}
