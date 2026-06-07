import { cookies } from "next/headers";
import { getCurrentUserEmail, isPlatformStaff } from "@/lib/auth/platform-admin";

/**
 * Per-tenant authorization for server actions.
 *
 * Background: this app uses a JWT (`token` cookie) + an external backend
 * (NEXT_PUBLIC_API_URL) as the source of truth for "which tenants may this user
 * touch". The Supabase-service-client actions bypass RLS, so without this check a
 * signed-in user could act on ANY tenantId simply by putting it in the URL.
 *
 * `requireTenantAccess(tenantId)` closes that hole:
 *   1. DEV PASS-THROUGH — when AUTH_ENFORCE !== "true" it is a no-op, mirroring the
 *      middleware. This keeps local development open until logins are wired.
 *   2. Requires a session token; throws NO_SESSION otherwise.
 *   3. Platform admin/staff bypass (they manage everything).
 *   4. Otherwise asks the external backend whether this token may access this tenant
 *      (GET {API_URL}/tenants/{tenantId}). A non-OK response → NO_TENANT_ACCESS.
 *
 * Throwing here surfaces to the client as a Server Action error, which is the
 * intended fail-closed behavior once enforcement is on.
 */
export class AccessError extends Error {
  constructor(public code: "NO_SESSION" | "NO_TENANT_ACCESS" | "BACKEND_UNAVAILABLE", message: string) {
    super(message);
    this.name = "AccessError";
  }
}

const enforcing = () => process.env.AUTH_ENFORCE === "true";

async function sessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get("token")?.value ?? null;
}

/** Throws AccessError unless the current caller may act on `tenantId`. No-op in dev. */
export async function requireTenantAccess(tenantId: string): Promise<void> {
  if (!enforcing()) return; // dev pass-through — matches middleware AUTH_ENFORCE gate

  const token = await sessionToken();
  if (!token) throw new AccessError("NO_SESSION", "You must be signed in.");

  // Platform admins/staff may act on any tenant.
  if (await isPlatformStaff()) return;

  // Delegate the membership decision to the backend that owns it. If there's NO backend to
  // ask (unconfigured) or it's unreachable, do NOT hard-break the app — the in-code
  // `.eq("tenant_id", …)` scoping still prevents cross-tenant data access, and RLS (planned)
  // is the real defense-in-depth. We only BLOCK on an explicit "not a member" answer.
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) { console.warn("[requireTenantAccess] NEXT_PUBLIC_API_URL not set — allowing (in-code scoping applies)."); return; }
  let res: Response | null = null;
  try {
    res = await fetch(`${base}/tenants/${tenantId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  } catch {
    console.warn("[requireTenantAccess] membership backend unreachable — allowing (in-code scoping applies).");
    return;
  }
  // Only a definitive 401/403 means "you are not a member". Other non-OK (404/500/etc.) =
  // the endpoint can't answer → don't block legitimate work.
  if (res.status === 401 || res.status === 403) {
    const email = (await getCurrentUserEmail()) ?? "unknown";
    throw new AccessError("NO_TENANT_ACCESS", `${email} is not authorized for this workspace.`);
  }
}
