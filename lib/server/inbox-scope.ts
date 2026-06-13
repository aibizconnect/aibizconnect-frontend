import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getCurrentUserEmail, isPlatformStaff } from "@/lib/auth/platform-admin";

/**
 * Conversation visibility scope (D-333). Platform staff + tenant owner/admin see every thread;
 * a member with assigned_only=true is restricted to threads assigned to them PLUS the shared
 * "unassigned" pool (so no lead is missed). Dev/no-session defaults to open (in-code tenant
 * scoping still applies elsewhere).
 */
export interface InboxScope { userEmail: string; restrictToAssigned: boolean; isOwnerOrAdmin: boolean; }

export async function getInboxScope(tenantId: string): Promise<InboxScope> {
  const email = (await getCurrentUserEmail().catch(() => null)) || "";
  if (await isPlatformStaff().catch(() => false)) return { userEmail: email, restrictToAssigned: false, isOwnerOrAdmin: true };
  if (!email) return { userEmail: "", restrictToAssigned: false, isOwnerOrAdmin: true };
  try {
    const { data } = await createSupabaseServiceClient()
      .from("tenant_users").select("role, assigned_only, status").eq("tenant_id", tenantId).ilike("email", email).maybeSingle();
    const row: any = data;
    if (!row || row.status === "invited") return { userEmail: email, restrictToAssigned: false, isOwnerOrAdmin: true };
    const isOwnerOrAdmin = row.role === "owner" || row.role === "admin";
    return { userEmail: email, restrictToAssigned: !isOwnerOrAdmin && !!row.assigned_only, isOwnerOrAdmin };
  } catch {
    return { userEmail: email, restrictToAssigned: false, isOwnerOrAdmin: true }; // can't resolve → don't lock out
  }
}
