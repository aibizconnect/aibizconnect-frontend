"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-page Custom CSS (builder "Code" tab). Stored on website_pages.custom_css and
 * injected on the public page render inside the brand-token sandbox. Gracefully no-ops
 * if the column isn't applied yet.
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function getCustomCss(tenantId: string, pageId: string): Promise<string> {
  try {
    const { data } = await service().from("website_pages").select("custom_css").eq("tenant_id", tenantId).eq("id", pageId).single();
    return (data?.custom_css as string) ?? "";
  } catch { return ""; }
}

export async function saveCustomCss(tenantId: string, pageId: string, css: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service().from("website_pages").update({ custom_css: css }).eq("tenant_id", tenantId).eq("id", pageId);
    return { ok: !error, error: error?.message };
  } catch (e: unknown) { return { ok: false, error: (e as Error).message }; }
}
