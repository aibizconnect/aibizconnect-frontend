import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getUsageOverview, type UsageStatusItem } from "@/lib/server/entitlements";

/**
 * Platform admin directory (D-375) — read + manage ALL tenants and ALL users.
 * Distinct from lib/auth/team.ts (which is only the AI Biz Connect TEAM). Every caller must be
 * gated by isPlatformAdmin() at the server-action layer. Service-role only; never exposed to tenants.
 */

/** The real platform tenant — never deletable from any surface. */
export const PROTECTED_TENANT_IDS = ["d723a086-eac0-4b61-8742-25313370d0b7"];

export interface AdminTenant {
  id: string; name: string; slug: string | null; plan: string | null;
  createdAt: string | null; location: string | null; isProtected: boolean;
}

/**
 * Plan catalog — monthly list price in CENTS, mirroring the public pricing page
 * (components/marketing/abc/PricingPlans.tsx). `null` = custom/quote (Enterprise).
 * The subscriber view derives the monthly amount from here unless a per-tenant
 * `monthly_amount_cents` override is set.
 */
export const PLAN_CATALOG: Record<string, { label: string; cents: number | null }> = {
  free: { label: "Free", cents: 0 },
  starter: { label: "Starter", cents: 3900 },
  pro: { label: "Pro", cents: 8900 },
  premium: { label: "Premium", cents: 39900 },
  agency: { label: "Agency", cents: 69900 },
  enterprise: { label: "Enterprise", cents: null },
};
export const PLAN_KEYS = Object.keys(PLAN_CATALOG);
export type BillingStatus = "trialing" | "active" | "past_due" | "canceled" | "comp";

export interface Subscriber {
  id: string; name: string; slug: string | null; isProtected: boolean;
  plan: string;                 // plan key (free|starter|…)
  planLabel: string;            // human label
  inception: string | null;     // created_at — the day they joined
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  monthlyCents: number | null;  // resolved (override ?? catalog); null = custom
  monthlyOverride: boolean;     // true when a per-tenant amount overrides the plan
  dueDate: string | null;       // the date the console shows under "Next due"
  daysLeft: number | null;      // days until dueDate (negative = overdue), null if n/a
  // a single rolled-up state for the badge: paying | trial | trial_expired | due | comp | canceled
  state: "paying" | "trial" | "trial_expired" | "due" | "comp" | "canceled";
  members: number;              // active workspace members
  schemaReady: boolean;         // false until migration 0079 is applied (writes will fail)
  usage: UsageStatusItem[];     // current usage vs plan limits (contacts/seats/AI/sites)
}

const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";

function daysBetween(target: string | null): number | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

function rollUp(s: { billingStatus: BillingStatus; trialEndsAt: string | null; currentPeriodEnd: string | null }): Subscriber["state"] {
  if (s.billingStatus === "comp") return "comp";
  if (s.billingStatus === "canceled") return "canceled";
  if (s.billingStatus === "past_due") return "due";
  if (s.billingStatus === "trialing") {
    const d = daysBetween(s.trialEndsAt);
    return d !== null && d < 0 ? "trial_expired" : "trial";
  }
  // active: paying unless the period end has passed
  const d = daysBetween(s.currentPeriodEnd);
  return d !== null && d < 0 ? "due" : "paying";
}

/**
 * Every tenant as one of OUR subscribers, enriched with plan/billing lifecycle.
 * Tries the full (post-0079) schema; if the billing columns don't exist yet, falls
 * back to deriving status from plan + created_at so the console still renders.
 */
export async function listSubscribers(): Promise<Subscriber[]> {
  const sb = createSupabaseServiceClient();
  const full = "id,name,slug,plan,created_at,location_label,billing_status,trial_ends_at,current_period_end,monthly_amount_cents";
  let rows: any[] | null = null;
  let schemaReady = true;
  let res = await sb.from("tenants").select(full).order("created_at", { ascending: false });
  if (res.error) {
    // Pre-migration: billing columns absent → fall back to the base columns.
    schemaReady = false;
    const base = await sb.from("tenants").select("id,name,slug,plan,created_at,location_label").order("created_at", { ascending: false });
    if (base.error) throw new Error(base.error.message);
    rows = base.data ?? [];
  } else {
    rows = res.data ?? [];
  }

  // member counts in one query
  const ids = rows.map((r) => r.id);
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: tu } = await sb.from("tenant_users").select("tenant_id,status").in("tenant_id", ids);
    for (const r of tu ?? []) {
      if (!(r as any).status || (r as any).status === "active") counts.set((r as any).tenant_id, (counts.get((r as any).tenant_id) ?? 0) + 1);
    }
  }

  return Promise.all(rows.map(async (t) => {
    const plan = (t.plan ?? "free") as string;
    const cat = PLAN_CATALOG[plan] ?? { label: plan, cents: null };
    const isProtected = PROTECTED_TENANT_IDS.includes(t.id);

    // Status: real column if present, else derive.
    let billingStatus: BillingStatus = (t.billing_status as BillingStatus) || (plan === "free" ? "trialing" : "active");
    if (t.id === PLATFORM_TENANT) billingStatus = "comp";
    const trialEndsAt = t.trial_ends_at ?? (schemaReady ? null : (t.created_at ? new Date(new Date(t.created_at).getTime() + 14 * 86_400_000).toISOString() : null));
    const currentPeriodEnd = t.current_period_end ?? null;

    const override = typeof t.monthly_amount_cents === "number";
    const monthlyCents = billingStatus === "comp" ? 0 : (override ? t.monthly_amount_cents : cat.cents);
    const state = rollUp({ billingStatus, trialEndsAt, currentPeriodEnd });
    const dueDate = state === "comp" || state === "canceled" ? null : (billingStatus === "trialing" ? trialEndsAt : currentPeriodEnd);

    return {
      id: t.id, name: t.name ?? "(unnamed)", slug: t.slug ?? null, isProtected,
      plan, planLabel: cat.label, inception: t.created_at ?? null,
      billingStatus, trialEndsAt, currentPeriodEnd,
      monthlyCents, monthlyOverride: override,
      dueDate, daysLeft: daysBetween(dueDate), state,
      members: counts.get(t.id) ?? 0, schemaReady,
      usage: await getUsageOverview(t.id),
    } satisfies Subscriber;
  }));
}

/** Friendly error when the 0079 billing columns aren't applied yet. */
function notReady(e: any): never {
  if (/column .*(billing_status|trial_ends_at|current_period_end|monthly_amount_cents)/i.test(e?.message ?? "")) {
    throw new Error("Apply migration 0079_tenant_billing.sql first, then retry.");
  }
  throw new Error(e?.message ?? "Update failed.");
}

/** Change a subscriber's plan tier. Clears any custom amount override so it re-derives. */
export async function setSubscriberPlan(tenantId: string, plan: string): Promise<void> {
  if (!PLAN_KEYS.includes(plan)) throw new Error(`Unknown plan "${plan}".`);
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenants").update({ plan, monthly_amount_cents: null }).eq("id", tenantId);
  if (error) notReady(error);
}

/** Extend (or start) a trial by N days from the later of now / the existing trial end. */
export async function extendSubscriberTrial(tenantId: string, days: number): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenants").select("trial_ends_at").eq("id", tenantId).maybeSingle();
  const base = data?.trial_ends_at ? new Date(data.trial_ends_at as string).getTime() : 0;
  const from = Math.max(base, Date.now());
  const next = new Date(from + days * 86_400_000).toISOString();
  const { error } = await sb.from("tenants").update({ billing_status: "trialing", trial_ends_at: next }).eq("id", tenantId);
  if (error) notReady(error);
}

/** Make a tenant free-to-play (comp) — full access, never billed — or revert to active. */
export async function setSubscriberComp(tenantId: string, comp: boolean): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenants").update({ billing_status: comp ? "comp" : "active" }).eq("id", tenantId);
  if (error) notReady(error);
}

/** Mark a subscriber active (paying) with a next-due date, or set another lifecycle status. */
export async function setSubscriberStatus(tenantId: string, status: BillingStatus, nextDue?: string | null): Promise<void> {
  const sb = createSupabaseServiceClient();
  const patch: Record<string, unknown> = { billing_status: status };
  if (nextDue !== undefined) patch.current_period_end = nextDue;
  const { error } = await sb.from("tenants").update(patch).eq("id", tenantId);
  if (error) notReady(error);
}

/** Set a custom monthly amount (cents) override, or clear it (null → re-derive from plan). */
export async function setSubscriberAmount(tenantId: string, cents: number | null): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenants").update({ monthly_amount_cents: cents }).eq("id", tenantId);
  if (error) notReady(error);
}
export interface AdminUser {
  id: string; email: string; name: string; confirmed: boolean; banned: boolean;
  platformRole: string | null; createdAt: string | null; lastSignInAt: string | null;
}

export async function listAllTenants(): Promise<AdminTenant[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenants").select("id,name,slug,plan,created_at,location_label").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t: any) => ({
    id: t.id, name: t.name ?? "(unnamed)", slug: t.slug ?? null, plan: t.plan ?? null,
    createdAt: t.created_at ?? null, location: t.location_label ?? null,
    isProtected: PROTECTED_TENANT_IDS.includes(t.id),
  }));
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const sb = createSupabaseServiceClient();
  const out: AdminUser[] = [];
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users as any[]) {
      const email = (u.email || "").toLowerCase();
      const meta = u.app_metadata || {};
      const bannedUntil = u.banned_until ? new Date(u.banned_until).getTime() : 0;
      out.push({
        id: u.id, email,
        name: (u.user_metadata?.full_name || u.user_metadata?.name || "").trim() || email.split("@")[0],
        confirmed: !!u.email_confirmed_at,
        banned: !!(bannedUntil && bannedUntil > Date.now()),
        platformRole: String(meta.platform_role || meta.platformRole || "") || null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    if (data.users.length < 200) break;
  }
  return out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/** Hard-delete an auth user (and their Supabase identity). Memberships fall away with the tenant. */
export async function deleteUserAccount(userId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

/** Ban (deactivate) or reactivate an auth user. */
export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" } as any);
  if (error) throw new Error(error.message);
}

/** Delete a tenant and ALL its data via the cascade RPC (migration 0075). Platform tenant is refused. */
export async function deleteTenantCascade(tenantId: string): Promise<void> {
  if (PROTECTED_TENANT_IDS.includes(tenantId)) throw new Error("This is the protected platform tenant — it can't be deleted.");
  const sb = createSupabaseServiceClient();
  const { error } = await sb.rpc("delete_tenant_cascade", { p_tenant: tenantId });
  if (error) {
    if (/function .*delete_tenant_cascade/i.test(error.message)) throw new Error("Apply migration 0075_delete_tenant_cascade.sql first, then retry.");
    throw new Error(error.message);
  }
}
