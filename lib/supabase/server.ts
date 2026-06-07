import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  // Prefer the anon key; fall back to the publishable key name this project
  // was originally configured with so existing envs keep working.
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // Setting cookies is only allowed in Server Actions / Route Handlers.
          // Wrap in try/catch so read-only Server Components don't throw on
          // session refresh.
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // no-op in a Server Component render
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // no-op in a Server Component render
          }
        },
      },
    }
  );
}
