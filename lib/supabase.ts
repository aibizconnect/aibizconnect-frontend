import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Lazy service-role client. The client is created on FIRST USE (at request time), never at module
 * import — otherwise Vercel's build-time "collect page data" step (which has no service-role key in
 * env) throws "supabaseKey is required" and fails the whole build. Accessing any property proxies to
 * a singleton created on demand.
 *
 * NOTE: most of the app should use lib/supabase/service.ts (createSupabaseServiceClient) or
 * lib/supabase/server.ts. This module backs the legacy lib/db.ts helper only.
 */
let _client: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = (client() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client()) : value;
  },
}) as SupabaseClient;
