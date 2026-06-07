import { cookies } from "next/headers";

/**
 * Resolve the current user's id (server-side) from the custom-JWT `token` cookie.
 * The app uses a custom JWT (not Supabase Auth); the user id is the `sub` claim.
 * Returns null when there's no/invalid token. Never throws.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get("token")?.value;
    if (!token) return null;
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json) as Record<string, unknown>;
    return (payload.sub ?? payload.user_id ?? payload.userId ?? null) as string | null;
  } catch {
    return null;
  }
}
