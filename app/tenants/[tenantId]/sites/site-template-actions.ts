"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { listSiteTemplates, seedSiteTemplates } from "@/lib/server/site-templates";
import { applySiteTemplate } from "@/lib/server/site-template-applier";
import { createWebsite } from "@/app/tenants/[tenantId]/website/website-actions";

/**
 * Tenant-facing "Start from a template" (D-364). Lists the seeded site templates and creates a NEW
 * (blank) website + applies the chosen template to it in one step — so the applier's fresh-mode
 * guard is always satisfied (a brand-new site is empty, nothing to clobber).
 */
export interface SiteTemplateCard { id: string; name: string; industry: string; blurb: string; pages: number }

export async function listSiteTemplatesForTenant(tenantId: string): Promise<SiteTemplateCard[]> {
  await requireTenantAccess(tenantId);
  let ts = await listSiteTemplates();
  // Auto-seed the system templates on first use (idempotent) so the picker is never empty once the
  // table exists — no separate platform-admin step needed.
  if (ts.length === 0) { try { await seedSiteTemplates(); ts = await listSiteTemplates(); } catch { /* table missing → stays empty */ } }
  return ts.map((t) => ({ id: t.id, name: t.name, industry: t.industry, blurb: String((t.manifest as any)?.blurb ?? ""), pages: t.pages.length }));
}

export async function createSiteFromTemplate(tenantId: string, name: string, templateId: string): Promise<{ ok: boolean; websiteId?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!name.trim()) return { ok: false, message: "Enter a name for the new website." };
  let website: { id: string };
  try { website = await createWebsite(tenantId, name.trim()); }
  catch (e: any) { return { ok: false, message: e?.message ?? "Could not create the website." }; }
  const report = await applySiteTemplate(tenantId, website.id, templateId, { mode: "fresh" });
  return report.ok
    ? { ok: true, websiteId: website.id, message: report.message }
    : { ok: false, websiteId: website.id, message: report.message };
}

/** Rebuild an EXISTING website from a template (replace mode) — wipes its pages, then applies. */
export async function applyTemplateToWebsite(tenantId: string, websiteId: string, templateId: string): Promise<{ ok: boolean; websiteId?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  const report = await applySiteTemplate(tenantId, websiteId, templateId, { mode: "replace" });
  return { ok: report.ok, websiteId, message: report.message };
}
