import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getPlatformRole } from "@/lib/auth/platform-admin";
import { resolveDefaultTenantId } from "@/lib/tenant-resolve";

/**
 * Post-login resolver. Sends every signed-in user to their workspace dashboard. Platform
 * admins reach the Platform panel via a sidebar link (not here). Only if no workspace can be
 * resolved do we show a small fallback (with a Platform link for admins) — never a dead end.
 */
export default async function HomeResolver() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/home");

  const tenantId = await resolveDefaultTenantId();
  if (tenantId) redirect(`/tenants/${tenantId}/dashboard`);

  // No workspace yet. Platform team manages the platform (not forced to create a tenant); a regular
  // signed-in user is sent to onboarding to CREATE their workspace (the real flow, D-378/379).
  const role = await getPlatformRole();
  if (!role) redirect("/onboarding");
  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-xl font-semibold text-slate-900">No workspace yet</h1>
      <p className="mt-2 text-sm text-slate-500">
        Signed in as <b>{user.email}</b>. We couldn&apos;t find a workspace to open
        {role ? " — set DEFAULT_TENANT_ID, or create a website first." : "."}
      </p>
      {role && (
        <Link href="/platform" className="mt-6 inline-block rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Open Platform panel</Link>
      )}
      <form action="/auth/signout" method="post" className="mt-3">
        <button className="text-sm text-slate-400 hover:text-slate-600">Sign out</button>
      </form>
    </main>
  );
}
