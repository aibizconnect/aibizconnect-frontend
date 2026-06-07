import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * G-approval queue (UI-2). Human-Approval (G) breakpoints — send/spend/call — are
 * persisted as actionable approval items so a tenant can approve or deny them in-app.
 * This makes the S-1 safety guarantee first-class and auditable instead of just a 409.
 *
 * All writes are service-role and wrapped in try/catch: if the table isn't applied yet
 * the supervisor keeps working (the run still halts with a 409), just without a queue
 * row. Approving here records the decision; it does NOT auto-execute a live send (live
 * still requires the domain's key + execution path) — nothing sends without both.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export interface ApprovalRow {
  id: string;
  tenant_id: string;
  domain: string | null;
  role: string | null;
  gated_action_ids: string[] | null;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

/** Record a pending approval when a G breakpoint halts a run. Best-effort. */
export async function createApproval(args: {
  tenantId: string; userId?: string | null; domain?: string | null; role?: string | null;
  plan: unknown; gatedActionIds?: string[]; reason?: string;
}): Promise<{ ok: boolean; id?: string }> {
  try {
    const { data, error } = await service().from("agent_approvals").insert({
      tenant_id: args.tenantId, user_id: args.userId ?? null, domain: args.domain ?? null, role: args.role ?? null,
      plan: args.plan ?? {}, gated_action_ids: args.gatedActionIds ?? [], reason: args.reason ?? null, status: "pending",
    }).select("id").single();
    if (error) return { ok: false };
    return { ok: true, id: data?.id };
  } catch {
    return { ok: false };
  }
}

export async function listApprovals(tenantId: string, status: "pending" | "approved" | "denied" = "pending"): Promise<ApprovalRow[]> {
  try {
    const { data, error } = await service()
      .from("agent_approvals")
      .select("id, tenant_id, domain, role, gated_action_ids, reason, status, created_at")
      .eq("tenant_id", tenantId).eq("status", status)
      .order("created_at", { ascending: false }).limit(50);
    if (error || !data) return [];
    return data as ApprovalRow[];
  } catch {
    return [];
  }
}

export async function decideApproval(args: { id: string; tenantId: string; decision: "approved" | "denied"; userId?: string | null }): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await service().from("agent_approvals")
      .update({ status: args.decision, decided_at: new Date().toISOString(), decided_by: args.userId ?? null })
      .eq("id", args.id).eq("tenant_id", args.tenantId).eq("status", "pending");
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
