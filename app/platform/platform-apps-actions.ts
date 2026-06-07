"use server";

import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { setIntegrationSecret, getIntegrationSecret, deleteIntegrationSecret } from "@/lib/server/integrations";

/**
 * Platform OAuth-app credentials (superadmin only). Stores each provider's app id/secret (and the
 * Cloudflare token/zone) as an ENCRYPTED platform secret under the system tenant, exactly where
 * providerAppCreds()/shopifyAppCreds()/platformCreds() already look — so connecting these in-app is
 * equivalent to setting the env vars, with no server restart. Secret fields are NEVER returned.
 */

async function requireSuperadmin(): Promise<void> {
  const { isPlatformSuperAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformSuperAdmin())) throw new Error("Superadmin only.");
}
async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action, actorEmail: await getCurrentUserEmail(), meta });
  } catch { /* best effort */ }
}

/** Registry of platform apps. `secret:true` fields are write-only (never returned). */
export interface PlatformAppField { name: string; label: string; secret: boolean }
export interface PlatformAppDef { key: string; label: string; fields: PlatformAppField[] }

const APPS: PlatformAppDef[] = [
  { key: "facebook_platform_app", label: "Facebook / Instagram", fields: [{ name: "app_id", label: "App ID", secret: false }, { name: "app_secret", label: "App Secret", secret: true }] },
  { key: "linkedin_platform_app", label: "LinkedIn", fields: [{ name: "app_id", label: "Client ID", secret: false }, { name: "app_secret", label: "Client Secret", secret: true }] },
  { key: "youtube_platform_app", label: "YouTube (Google)", fields: [{ name: "app_id", label: "Client ID", secret: false }, { name: "app_secret", label: "Client Secret", secret: true }] },
  { key: "tiktok_platform_app", label: "TikTok", fields: [{ name: "app_id", label: "Client Key", secret: false }, { name: "app_secret", label: "Client Secret", secret: true }] },
  { key: "x_platform_app", label: "X (Twitter)", fields: [{ name: "app_id", label: "Client ID", secret: false }, { name: "app_secret", label: "Client Secret", secret: true }] },
  { key: "shopify_platform_app", label: "Shopify", fields: [{ name: "app_id", label: "API Key", secret: false }, { name: "app_secret", label: "API Secret", secret: true }] },
  { key: "stripe_identity_platform_app", label: "Stripe Identity (KYC)", fields: [{ name: "secret_key", label: "Secret Key (sk_…)", secret: true }, { name: "webhook_secret", label: "Webhook Signing Secret (whsec_…)", secret: true }] },
  { key: "cloudflare_platform", label: "Cloudflare (DNS)", fields: [{ name: "zone_id", label: "Zone ID", secret: false }, { name: "api_token", label: "API Token", secret: true }] },
];

export interface PlatformAppView { key: string; label: string; fields: PlatformAppField[]; values: Record<string, string>; hasSecret: boolean }

export async function listPlatformApps(): Promise<PlatformAppView[]> {
  await requireSuperadmin();
  const out: PlatformAppView[] = [];
  for (const app of APPS) {
    let values: Record<string, string> = {};
    let hasSecret = false;
    try {
      const s = await getIntegrationSecret(SYSTEM_TENANT_ID, app.key);
      if (s) {
        hasSecret = app.fields.some((f) => f.secret && s[f.name]);
        for (const f of app.fields) if (!f.secret && s[f.name] != null) values[f.name] = String(s[f.name]); // non-secret only
      }
    } catch { /* not set */ }
    out.push({ key: app.key, label: app.label, fields: app.fields, values, hasSecret });
  }
  return out;
}

export async function savePlatformApp(key: string, input: Record<string, string>): Promise<{ ok: boolean; message?: string }> {
  await requireSuperadmin();
  const app = APPS.find((a) => a.key === key);
  if (!app) return { ok: false, message: "Unknown app." };
  try {
    const { encryptionReady } = await import("@/lib/server/encryption");
    if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY first." };
    // Merge with existing so a blank secret field keeps the stored value.
    const existing = (await getIntegrationSecret(SYSTEM_TENANT_ID, key).catch(() => null)) ?? {};
    const merged: Record<string, unknown> = { ...existing };
    for (const f of app.fields) {
      const v = (input[f.name] ?? "").trim();
      if (v) merged[f.name] = v;
      else if (!f.secret) merged[f.name] = ""; // allow clearing non-secret fields
    }
    // Require all non-secret fields + a secret present (either new or already stored).
    for (const f of app.fields) {
      if (!f.secret && !merged[f.name]) return { ok: false, message: `${f.label} is required.` };
      if (f.secret && !merged[f.name]) return { ok: false, message: `${f.label} is required.` };
    }
    await setIntegrationSecret(SYSTEM_TENANT_ID, key, merged);
    await audit("platform_app.save", { key });
    return { ok: true };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save." }; }
}

export async function deletePlatformApp(key: string): Promise<{ ok: boolean }> {
  await requireSuperadmin();
  await deleteIntegrationSecret(SYSTEM_TENANT_ID, key);
  await audit("platform_app.delete", { key });
  return { ok: true };
}
