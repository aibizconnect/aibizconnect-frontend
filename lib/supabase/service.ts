import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for tenant-scoped server mutations.
 *
 * Why this exists: the website editor's server actions originally used the
 * anon/cookie client (lib/supabase/server). But this app authenticates with a
 * custom JWT + external backend, NOT Supabase Auth — so the anon client carries
 * no Supabase session, and RLS on the website_* tables allows SELECT but blocks
 * INSERT/UPDATE/DELETE. The result: the editor appeared to save but every write
 * was silently dropped (update returns 0 rows, no error).
 *
 * Every other module in this app (CRM, Calendars, Reputation, Reporting,
 * Funnels, Tools, brand-memory, entitlements, …) already uses the service-role
 * key for exactly this reason. This helper makes the website editor consistent
 * with them so its writes actually persist.
 *
 * Tenant scoping is preserved IN CODE: every query still filters by
 * `.eq("tenant_id", tenantId)`. Service-role bypasses RLS, not the explicit
 * tenant filter. (Deferred-auth posture, same as the rest of the app.)
 */
export function createSupabaseServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
