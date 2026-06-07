import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { seedTenantPolicies } from "./entitlements";
import { addSubdomain, listTenantDomains } from "./domains";

/**
 * Tenant provisioning (onboarding hook). Run right after a tenant is created so a new
 * tenant is INSTANTLY live + correctly entitled with zero manual steps:
 *   1) seed the default entitlement policies (so free features work, paid are gated)
 *   2) auto-provision a free {subdomain}.aibizconnect.app from the tenant slug
 * Idempotent: safe to call repeatedly (skips if a subdomain already exists; policy
 * upsert is no-op on conflict).
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const sanitizeSub = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-").slice(0, 38) || "site";

export async function provisionTenant(args: { tenantId: string; subdomain?: string; ownerUserId?: string | null }): Promise<{
  ok: boolean; policiesSeeded: boolean; subdomain: string | null; note: string;
}> {
  // 1) entitlement defaults
  const seeded = await seedTenantPolicies(args.tenantId);

  // 2) subdomain (skip if the tenant already has one)
  const existing = await listTenantDomains(args.tenantId);
  if (existing.some((d) => d.subdomain)) {
    const sub = existing.find((d) => d.subdomain)!.subdomain!;
    return { ok: seeded.ok, policiesSeeded: seeded.ok, subdomain: sub, note: "already provisioned" };
  }

  // derive a base subdomain from the provided value or the tenant slug
  let base = args.subdomain ? sanitizeSub(args.subdomain) : "";
  if (!base) {
    try {
      const { data } = await service().from("tenants").select("slug, name").eq("id", args.tenantId).maybeSingle();
      base = sanitizeSub(data?.slug || data?.name || "site");
    } catch { base = "site"; }
  }

  // ensure global uniqueness (append a short suffix on collision)
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const res = await addSubdomain({ tenantId: args.tenantId, subdomain: candidate, ownerUserId: args.ownerUserId });
    if (res.ok) return { ok: true, policiesSeeded: seeded.ok, subdomain: candidate, note: "provisioned" };
    if (!/already taken/i.test(res.error ?? "")) return { ok: false, policiesSeeded: seeded.ok, subdomain: null, note: res.error ?? "subdomain failed" };
    candidate = `${base}-${(i + 2)}`.slice(0, 40);
  }
  return { ok: false, policiesSeeded: seeded.ok, subdomain: null, note: "could not find a free subdomain" };
}
