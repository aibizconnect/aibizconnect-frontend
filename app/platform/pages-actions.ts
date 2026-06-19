"use server";

import { isPlatformAdmin, getCurrentUserEmail } from "@/lib/auth/platform-admin";
import { logPlatformEvent, listPlatformAudit } from "@/lib/audit/platform-audit";

/**
 * "Site Pages" console actions. The public marketing pages are code-rendered (not tenant
 * website_pages), so they can't be edited in the visual editor. Instead the team tells the AI
 * what to change / add / reorder; requests are captured to platform_audit_log (no migration) and
 * the AI build agent applies them to the live site. Admin-gated.
 */
export type SiteRequestKind = "change" | "add" | "reorder";
export interface SiteRequest { id: string; created_at: string; actor: string | null; kind: SiteRequestKind; route: string | null; instruction: string }

export async function submitSiteRequest(kind: SiteRequestKind, route: string | null, instruction: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await isPlatformAdmin())) return { ok: false, error: "Admin only." };
  const text = (instruction || "").trim();
  if (!text) return { ok: false, error: "Please describe what you'd like the AI to do." };
  await logPlatformEvent({
    action: "site.ai_request",
    actorEmail: await getCurrentUserEmail(),
    meta: { kind, route: route || null, instruction: text.slice(0, 4000) },
  });
  return { ok: true };
}

export async function listSiteRequests(): Promise<SiteRequest[]> {
  if (!(await isPlatformAdmin())) return [];
  const audit = await listPlatformAudit(100);
  return audit
    .filter((a) => a.action === "site.ai_request")
    .map((a) => ({
      id: a.id,
      created_at: a.created_at,
      actor: a.actor_email,
      kind: (a.meta?.kind as SiteRequestKind) ?? "change",
      route: (a.meta?.route as string) ?? null,
      instruction: (a.meta?.instruction as string) ?? "",
    }));
}
