import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Popups (exit-intent / timed / on-load lead capture) — best-in-class. Stored in the
 * existing website_global_blocks table (type='popup', kind='element') so NO new schema is
 * needed. Rendered on the public site by a client overlay with trigger logic. Popups are
 * display-only lead capture; submitting a form is a separate (gated) action — popups here
 * never send/charge.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export type PopupTrigger = "load" | "timer" | "exit";
export type PopupWidth = "sm" | "md" | "lg";
export type PopupPosition = "center" | "bottom-right" | "bottom-left" | "top";

export interface PopupContent {
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  trigger: PopupTrigger;
  delaySec?: number;     // for timer
  width: PopupWidth;
  position: PopupPosition;
  enabled: boolean;
}

export interface Popup { id: string; name: string; content: PopupContent; }

const DEFAULT: PopupContent = { heading: "Wait — before you go!", body: "Get a free consultation.", ctaLabel: "Get started", ctaHref: "#", trigger: "exit", delaySec: 5, width: "md", position: "center", enabled: true };

export async function listPopups(tenantId: string, opts?: { enabledOnly?: boolean }): Promise<Popup[]> {
  const sb = service();
  const { data } = await sb.from("website_global_blocks")
    .select("id, name, content").eq("tenant_id", tenantId).eq("type", "popup").order("updated_at", { ascending: false });
  let rows = (data ?? []).map((r: any) => ({ id: r.id, name: r.name, content: { ...DEFAULT, ...(r.content ?? {}) } as PopupContent }));
  if (opts?.enabledOnly) rows = rows.filter((p) => p.content.enabled);
  return rows;
}

export async function savePopup(args: { tenantId: string; id?: string; name: string; content: PopupContent }): Promise<{ ok: boolean; error?: string }> {
  const sb = service();
  if (args.id) {
    const { error } = await sb.from("website_global_blocks")
      .update({ name: args.name, content: args.content, updated_at: new Date().toISOString() })
      .eq("tenant_id", args.tenantId).eq("id", args.id);
    return { ok: !error, error: error?.message };
  }
  const { error } = await sb.from("website_global_blocks")
    .insert({ tenant_id: args.tenantId, name: args.name, type: "popup", kind: "element", scope: "account", content: args.content });
  return { ok: !error, error: error?.message };
}

export async function deletePopup(tenantId: string, id: string): Promise<{ ok: boolean }> {
  const sb = service();
  await sb.from("website_global_blocks").delete().eq("tenant_id", tenantId).eq("id", id).eq("type", "popup");
  return { ok: true };
}

export { DEFAULT as DEFAULT_POPUP };
