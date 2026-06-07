import { isPlatformSuperAdmin, isOwner } from "@/lib/auth/platform-admin";
import { listTeam } from "@/lib/auth/team";
import TeamConsole from "@/components/team/TeamConsole";

/**
 * Superadmin-only Team console. Renders the team list server-side (service role) and hands
 * it to the client component. Non-superadmins get a clear "not authorized" page — the data
 * is never fetched for them.
 */
export default async function TeamPage() {
  const allowed = await isPlatformSuperAdmin();
  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        <h1 className="mb-1 text-lg font-semibold text-amber-900">Team management</h1>
        This area is restricted to the platform <b>superadmin</b>.
      </div>
    );
  }
  const [initial, owner] = await Promise.all([listTeam(), isOwner()]);
  return <TeamConsole initial={initial} isOwner={owner} />;
}
