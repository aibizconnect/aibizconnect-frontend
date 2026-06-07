import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret } from "./encryption";

/**
 * Server-only access to tenant integration SECRETS. This module is NOT a "use server" file, so
 * none of these are client-callable — only other server code (the thing that actually calls
 * Twilio/Shopify/Stripe on the tenant's behalf) imports getIntegrationSecret. Decrypted secrets
 * must NEVER be returned to a client.
 */

/** Store (or replace) the encrypted credentials for a tenant's integration. */
export async function setIntegrationSecret(tenantId: string, provider: string, secret: Record<string, unknown>): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const encrypted_payload = encryptSecret(JSON.stringify(secret));
  await supabase.from("tenant_secrets").upsert(
    { tenant_id: tenantId, provider, encrypted_payload, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" }
  );
}

/** Fetch + decrypt a tenant's integration credentials (SERVER-ONLY — for calling the provider). */
export async function getIntegrationSecret(tenantId: string, provider: string): Promise<Record<string, unknown> | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_secrets").select("encrypted_payload").eq("tenant_id", tenantId).eq("provider", provider).maybeSingle();
  if (!data?.encrypted_payload) return null;
  try { return JSON.parse(decryptSecret(data.encrypted_payload as string)); } catch { return null; }
}

export async function deleteIntegrationSecret(tenantId: string, provider: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_secrets").delete().eq("tenant_id", tenantId).eq("provider", provider);
}
