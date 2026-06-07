"use server";

import { dryRunCampaign, type CampaignResult, type CampaignDomain } from "@/lib/agent/orchestrator";
import { setDesignSystemEnabled, getDesignSystemEnabled } from "@/lib/design/brand-memory";
import { listApprovals, decideApproval, type ApprovalRow } from "@/lib/agent/approvals";
import { listTenantDomains, addSubdomain, addCustomDomain, removeDomain, type DomainRow } from "@/lib/domains";
import { getDnsChallenge, verifyCustomDomain, startPurchase } from "@/lib/domain-verify";
import { listIndustryTemplates } from "@/lib/design/templates";
import { applyTemplate, type ApplyTemplateResult } from "@/lib/templates-apply";

/**
 * Server action backing the Agents panel campaign launcher (UI-1). Runs the Mesh
 * Orchestrator dry-run for the current tenant. Cookie-authed page context — no Bearer
 * needed. Read-only/dry-run: composes + critiques, opens no live path.
 */
export async function composeCampaignAction(
  tenantId: string,
  goal: string,
  domains?: CampaignDomain[]
): Promise<{ ok: true; result: CampaignResult } | { ok: false; error: string }> {
  const trimmed = (goal ?? "").trim();
  if (trimmed.length < 3) return { ok: false, error: "Enter a goal (3+ characters)." };
  try {
    const result = await dryRunCampaign({ tenantId, goal: trimmed, domains });
    return { ok: true, result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Per-tenant publish/flip control for the new design system (Ali's direction). The
 * tenant owns whether their public site renders via the token-driven design system.
 * Degrades gracefully if the column isn't applied yet (returns the requested value
 * but the public page stays legacy until the DDL lands).
 */
export async function setSiteDesignAction(tenantId: string, enabled: boolean): Promise<{ ok: boolean; enabled: boolean; error?: string }> {
  const res = await setDesignSystemEnabled(tenantId, enabled);
  if (!res.ok) return { ok: false, enabled: await getDesignSystemEnabled(tenantId), error: res.error };
  return { ok: true, enabled };
}

/**
 * Start-from-Template (UI-1): list the industry-template catalog for the picker.
 * Read-only.
 */
export async function listTemplatesAction() {
  return listIndustryTemplates();
}

/**
 * Start-from-Template (UI-1): generate a full DRAFT site for this tenant from a chosen
 * industry template + business name, optionally seeding brand tokens. DRAFTS ONLY —
 * the tenant still publishes per page (O-3 critic gate) and flips the design toggle.
 */
export async function applyTemplateAction(
  tenantId: string,
  templateKey: string,
  businessName: string,
  applyBrand = true
): Promise<{ ok: boolean; error?: string; result?: ApplyTemplateResult }> {
  const name = (businessName ?? "").trim();
  if (!templateKey) return { ok: false, error: "Choose a template." };
  if (name.length < 2) return { ok: false, error: "Enter your business name (2+ characters)." };
  try {
    const result = await applyTemplate({ tenantId, templateKey, businessName: name, applyBrand });
    return result.ok ? { ok: true, result } : { ok: false, error: result.error ?? "Template apply failed.", result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/** UI-2: list this tenant's pending G-approval items. */
export async function listApprovalsAction(tenantId: string): Promise<ApprovalRow[]> {
  return listApprovals(tenantId, "pending");
}

/** UI-2: approve or deny a pending G-approval. Decision-only — does not auto-send. */
export async function decideApprovalAction(tenantId: string, id: string, decision: "approved" | "denied"): Promise<{ ok: boolean; approvals: ApprovalRow[] }> {
  await decideApproval({ id, tenantId, decision });
  return { ok: true, approvals: await listApprovals(tenantId, "pending") };
}

/** Domains & Websites: add a free subdomain, then return the refreshed list. */
export async function addSubdomainAction(tenantId: string, subdomain: string): Promise<{ ok: boolean; error?: string; domains: DomainRow[] }> {
  const res = await addSubdomain({ tenantId, subdomain });
  return { ok: res.ok, error: res.error, domains: await listTenantDomains(tenantId) };
}

/** Domains & Websites: add an entitlement-gated custom domain. */
export async function addCustomDomainAction(tenantId: string, domain: string, payer: "tenant" | "user" | "parent_tenant"): Promise<{ ok: boolean; error?: string; upgrade?: boolean; domains: DomainRow[] }> {
  const res = await addCustomDomain({ tenantId, domain, payer });
  return { ok: res.ok, error: res.error, upgrade: res.upgrade, domains: await listTenantDomains(tenantId) };
}

/** Domains & Websites: remove a domain. */
export async function removeDomainAction(tenantId: string, id: string): Promise<{ ok: boolean; domains: DomainRow[] }> {
  await removeDomain(tenantId, id);
  return { ok: true, domains: await listTenantDomains(tenantId) };
}

/** Custom-domain: get the DNS TXT challenge to display. */
export async function dnsChallengeAction(tenantId: string, id: string) {
  return getDnsChallenge(tenantId, id);
}

/** Custom-domain: verify the TXT record; activates on success. Returns refreshed list. */
export async function verifyDomainAction(tenantId: string, id: string): Promise<{ ok: boolean; active: boolean; error?: string; domains: DomainRow[] }> {
  const res = await verifyCustomDomain(tenantId, id);
  return { ok: res.ok, active: res.active, error: res.error, domains: await listTenantDomains(tenantId) };
}

/** Custom-domain: start purchase (NON-CHARGING stub; entitlement-gated). */
export async function startPurchaseAction(tenantId: string, id: string, payer: "tenant" | "user" | "parent_tenant") {
  return startPurchase({ tenantId, id, payer });
}
