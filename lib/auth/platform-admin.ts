import { cookies } from "next/headers";

/**
 * Platform team gate. The app uses a JWT (`token` cookie); we read the email claim and
 * check it against tiered allowlists. These are the AI Biz Connect TEAM who run the
 * platform — NOT tenant users.
 *
 * Tiers (highest to lowest), each a comma-separated env var with a sensible default:
 *   PLATFORM_SUPERADMIN_EMAILS  → owner / sysadmin (ultimate control)   [sysadmin@aibizconnect.app]
 *   PLATFORM_ADMIN_EMAILS       → admins who run the business           [admin@, al@aibizconnect.app]
 *   PLATFORM_STAFF_EMAILS       → support staff (day-to-day operations) [none by default]
 *
 * Each higher tier inherits everything the tiers below it can do. Server-side only; never throws.
 */
export type PlatformRole = "superadmin" | "admin" | "staff" | null;

function emailList(envVar: string, fallback = ""): string[] {
  const raw = process.env[envVar] || fallback;
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
const superAdminEmails = () => emailList("PLATFORM_SUPERADMIN_EMAILS", "sysadmin@aibizconnect.app");
const platformAdminEmails = () => emailList("PLATFORM_ADMIN_EMAILS", "admin@aibizconnect.app,al@aibizconnect.app");
const platformStaffEmails = () => emailList("PLATFORM_STAFF_EMAILS");

/** Decode the custom-JWT payload (never throws). */
async function jwtPayload(): Promise<Record<string, unknown> | null> {
  try {
    const store = await cookies();
    const token = store.get("token")?.value;
    if (!token) return null;
    const part = token.split(".")[1];
    if (!part) return null;
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch { return null; }
}

/** Cookie that holds the email a superadmin is currently "acting as" (impersonating). */
export const ACT_AS_COOKIE = "act_as";

function emailFromPayload(payload: Record<string, unknown> | null): string {
  return ((payload?.email ?? payload?.user_email ?? payload?.mail ?? "") as string).toLowerCase();
}

/** Map an email to a platform tier using the env allowlists (pure). */
export function roleForEmail(email: string): PlatformRole {
  if (!email) return null;
  if (superAdminEmails().includes(email)) return "superadmin";
  if (platformAdminEmails().includes(email)) return "admin";
  if (platformStaffEmails().includes(email)) return "staff";
  return null;
}

/** Role from a dedicated platform-role JWT claim (NOT the per-tenant `role`). */
function claimRole(payload: Record<string, unknown>): PlatformRole {
  const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
  const pr = String(payload.platform_role ?? payload.platformRole ?? appMeta.platform_role ?? appMeta.platformRole ?? "").toLowerCase();
  if (pr === "superadmin") return "superadmin";
  if (pr === "admin") return "admin";
  if (["staff", "support"].includes(pr)) return "staff";
  if (payload.is_platform_staff === true || payload.isPlatformStaff === true) return "staff";
  return null;
}

/** The REAL signed-in user's tier, ignoring any impersonation. */
export async function getRealPlatformRole(): Promise<PlatformRole> {
  const payload = await jwtPayload();
  if (!payload) return null;
  return roleForEmail(emailFromPayload(payload)) ?? claimRole(payload);
}

/** The REAL signed-in user is the owner — used to gate impersonation start/stop. */
export async function isRealSuperAdmin(): Promise<boolean> {
  return (await getRealPlatformRole()) === "superadmin";
}

async function actingAsCookie(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(ACT_AS_COOKIE)?.value?.toLowerCase();
  return v || null;
}

/**
 * Impersonation context. The `act_as` cookie is honored ONLY when the REAL signed-in user
 * is a superadmin — so the cookie on its own grants nothing and can't be used to escalate.
 */
export async function getImpersonation(): Promise<{ actingAs: string | null; realEmail: string | null; realRole: PlatformRole }> {
  const payload = await jwtPayload();
  const realEmail = payload ? emailFromPayload(payload) || null : null;
  const realRole = await getRealPlatformRole();
  if (realRole !== "superadmin") return { actingAs: null, realEmail, realRole };
  const act = await actingAsCookie();
  return { actingAs: act && act !== realEmail ? act : null, realEmail, realRole };
}

/** EFFECTIVE email — the impersonated identity when a superadmin is acting as someone. */
export async function getCurrentUserEmail(): Promise<string | null> {
  const { actingAs } = await getImpersonation();
  if (actingAs) return actingAs;
  const payload = await jwtPayload();
  return (payload ? emailFromPayload(payload) : "") || null;
}

/**
 * EFFECTIVE display identity for the dashboard chrome (impersonated identity when active).
 * Reads name from the Supabase JWT's user_metadata; falls back to the email local-part.
 * Returns null when not signed in. Server-side only; never throws.
 */
export async function getCurrentUser(): Promise<{ name: string; email: string } | null> {
  const { actingAs } = await getImpersonation();
  if (actingAs) return { name: actingAs.split("@")[0], email: actingAs };
  const payload = await jwtPayload();
  if (!payload) return null;
  const email = emailFromPayload(payload);
  if (!email) return null;
  const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
  const raw = (meta.full_name ?? meta.name ?? payload.name ?? "") as string;
  return { name: (raw || "").trim() || email.split("@")[0], email };
}

/**
 * The caller's EFFECTIVE platform tier. When a superadmin is impersonating, this resolves
 * to the target's tier so the app behaves exactly as that person — use getRealPlatformRole()
 * for owner-only controls like Exit. Higher tiers inherit lower ones.
 */
export async function getPlatformRole(): Promise<PlatformRole> {
  const { actingAs, realRole } = await getImpersonation();
  if (actingAs) return roleForEmail(actingAs) ?? "admin"; // act as the target's tier (default admin)
  return realRole;
}

/** Owner-level (effective): ultimate control. While impersonating a lower tier, this is false. */
export async function isPlatformSuperAdmin(): Promise<boolean> {
  return (await getPlatformRole()) === "superadmin";
}

/**
 * "Owner" = an email on the PLATFORM_SUPERADMIN_EMAILS env allowlist (e.g. sysadmin@).
 * This is the protected tier: only an owner may grant/revoke the superadmin role or create
 * a superadmin. A superadmin promoted only via app_metadata is NOT an owner. Uses the REAL
 * signed-in email (governance is never delegated through impersonation).
 */
export function ownerEmails(): string[] {
  return superAdminEmails();
}
export async function isOwner(): Promise<boolean> {
  const payload = await jwtPayload();
  const email = payload ? emailFromPayload(payload) : "";
  return !!email && ownerEmails().includes(email);
}

/** Admin-or-above: runs the business. */
export async function isPlatformAdmin(): Promise<boolean> {
  const r = await getPlatformRole();
  return r === "superadmin" || r === "admin";
}

/** Any platform team member (staff, admin, or superadmin). */
export async function isPlatformStaff(): Promise<boolean> {
  return (await getPlatformRole()) !== null;
}

/** Can manage the global SYSTEM library (bulk upload, describe): any platform team member. */
export async function canManageSystemLibrary(): Promise<boolean> {
  return (await getPlatformRole()) !== null;
}
