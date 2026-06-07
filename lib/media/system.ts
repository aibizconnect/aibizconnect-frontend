/**
 * System media scope (Copilot ruling — Option A). A reserved SYSTEM tenant owns global,
 * read-only assets (Starter Packs, Backgrounds, Business photos, Industry graphics).
 *
 * Architecture:
 *  - SYSTEM assets: every tenant can READ; only the service role can WRITE (RLS).
 *  - Tenant assets: isolated, fully editable by the owning tenant.
 *  - Copy-on-use: when a tenant uses a SYSTEM asset, it's COPIED into their own media —
 *    the SYSTEM original is never mutated; storage stays efficient (1 global + 1 per user
 *    who actually uses it, not 10,000 copies).
 *  - The nightly media_steward writes generated batches under SYSTEM_TENANT_ID.
 */
export const SYSTEM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export function isSystemTenant(tenantId: string): boolean {
  return tenantId === SYSTEM_TENANT_ID;
}
