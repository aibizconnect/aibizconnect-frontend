import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * General tenant SUBSCRIPTIONS engine (migration 0080). Every tenant defines their own plan
 * LEVELS (subscription_plans) and subscribes their CONTACTS to them (tenant_subscriptions).
 * Status routes a subscription into the Payments flow:
 *   pending|trialing → Orders ;  active|past_due|comp → Recurring ;  canceled → ended.
 * Tenant-scoped; callers gate with requireTenantAccess. All reads guard the missing table
 * (pre-0080) by returning empty, so the Payments tabs render before the migration is applied.
 */

export type SubInterval = "month" | "year" | "week";
export type SubStatus = "pending" | "trialing" | "active" | "past_due" | "comp" | "canceled";

/** A metered limit a plan grants. enforce: 'off' = track only, 'warn' = allow + flag, 'block' = hard cap. */
export type EnforceMode = "off" | "warn" | "block";
export interface Entitlement {
  key: string;            // 'contacts' | 'seats' | 'ai_credits' | 'websites' | custom
  label: string;          // human label shown in UI
  included: number;       // quantity included in the plan
  unit: string;           // e.g. "contacts", "seats", "credits/mo"
  overageCents: number | null; // price per extra unit when over (null = not billable)
  enforce: EnforceMode;
}

export interface SubscriptionPlan {
  id: string; name: string; description: string | null;
  amountCents: number; currency: string; interval: SubInterval;
  trialDays: number; features: string[]; isActive: boolean; sortOrder: number;
  entitlements: Entitlement[];
  // Public-pricing presentation (optional columns; default safely when absent so the
  // public site renders before any presentation migration is applied).
  isFeatured: boolean; isPublic: boolean; annualAmountCents: number | null;
  ctaLabel: string | null; ctaHref: string | null;
}
export interface PlanInput {
  name: string; description?: string | null; amountCents?: number; currency?: string;
  interval?: SubInterval; trialDays?: number; features?: string[]; isActive?: boolean; sortOrder?: number;
  entitlements?: Entitlement[];
}

// Which Payments tab a status belongs to.
export const ORDER_STATUSES: SubStatus[] = ["pending", "trialing"];
export const RECURRING_STATUSES: SubStatus[] = ["active", "past_due", "comp"];

export type SubState = "trial" | "trial_expired" | "pending" | "paying" | "due" | "comp" | "canceled";

export interface SubscriptionRow {
  id: string; contactId: string | null; contactName: string;
  planId: string | null; planName: string;
  status: SubStatus; state: SubState;
  amountCents: number | null; monthlyCents: number; interval: SubInterval;
  startedAt: string | null; trialEndsAt: string | null; currentPeriodEnd: string | null;
  canceledAt: string | null; dueDate: string | null; daysLeft: number | null;
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.round((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function addInterval(from: Date, interval: SubInterval): string {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else if (interval === "week") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// Normalize any cadence to a monthly figure for MRR.
function toMonthly(amountCents: number, interval: SubInterval): number {
  if (interval === "year") return Math.round(amountCents / 12);
  if (interval === "week") return Math.round((amountCents * 52) / 12);
  return amountCents;
}

function rollUp(status: SubStatus, trialEndsAt: string | null, currentPeriodEnd: string | null): SubState {
  if (status === "comp") return "comp";
  if (status === "canceled") return "canceled";
  if (status === "pending") return "pending";
  if (status === "past_due") return "due";
  if (status === "trialing") {
    const d = daysUntil(trialEndsAt);
    return d !== null && d < 0 ? "trial_expired" : "trial";
  }
  const d = daysUntil(currentPeriodEnd); // active
  return d !== null && d < 0 ? "due" : "paying";
}

const toFeatures = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : [];
const toEntitlements = (v: unknown): Entitlement[] => Array.isArray(v) ? v.map((e: any) => ({
  key: String(e?.key ?? ""), label: String(e?.label ?? e?.key ?? ""),
  included: Number(e?.included ?? 0), unit: String(e?.unit ?? ""),
  overageCents: e?.overageCents == null ? null : Number(e.overageCents),
  enforce: (["off", "warn", "block"].includes(e?.enforce) ? e.enforce : "off") as EnforceMode,
})).filter((e) => e.key) : [];

function mapPlan(r: any): SubscriptionPlan {
  return {
    id: r.id, name: r.name ?? "(unnamed)", description: r.description ?? null,
    amountCents: r.amount_cents ?? 0, currency: r.currency ?? "USD", interval: (r.interval ?? "month") as SubInterval,
    trialDays: r.trial_days ?? 0, features: toFeatures(r.features), isActive: r.is_active !== false, sortOrder: r.sort_order ?? 0,
    entitlements: toEntitlements(r.entitlements),
    isFeatured: r.is_featured === true, isPublic: r.is_public !== false, annualAmountCents: r.annual_amount_cents ?? null,
    ctaLabel: r.cta_label ?? null, ctaHref: r.cta_href ?? null,
  };
}

// ── Plans ────────────────────────────────────────────────────────────────────
export async function listPlans(tenantId: string): Promise<SubscriptionPlan[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("subscription_plans").select("*").eq("tenant_id", tenantId).order("sort_order").order("created_at");
  if (error) return [];
  return (data ?? []).map(mapPlan);
}

export async function upsertPlan(tenantId: string, input: PlanInput & { id?: string }): Promise<void> {
  const sb = createSupabaseServiceClient();
  const row: Record<string, unknown> = {
    tenant_id: tenantId, name: input.name, description: input.description ?? null,
    amount_cents: Math.max(0, Math.round(input.amountCents ?? 0)), currency: input.currency ?? "USD",
    interval: input.interval ?? "month", trial_days: Math.max(0, Math.round(input.trialDays ?? 0)),
    features: input.features ?? [], is_active: input.isActive ?? true, sort_order: input.sortOrder ?? 0,
    entitlements: input.entitlements ?? [],
    updated_at: new Date().toISOString(),
  };
  // Persist; if the `entitlements` column isn't there yet (pre-0081), retry without it so saving still works.
  const write = async (r: Record<string, unknown>) => input.id
    ? sb.from("subscription_plans").update(r).eq("id", input.id).eq("tenant_id", tenantId)
    : sb.from("subscription_plans").insert(r);
  let { error } = await write(row);
  if (error && /column .*entitlements/i.test(error.message)) {
    const { entitlements, ...rest } = row; void entitlements;
    ({ error } = await write(rest));
  }
  if (error) throw new Error(error.message);
}

export async function deletePlan(tenantId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("subscription_plans").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

// ── Usage metering ───────────────────────────────────────────────────────────
/** Current usage for a tenant across the metered features (for usage-vs-entitlement views). */
export interface TenantUsage { contacts: number; seats: number; ai_credits: number; websites: number; }
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  const sb = createSupabaseServiceClient();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const head = { count: "exact" as const, head: true };
  const [c, s, w, ai] = await Promise.all([
    sb.from("tenant_contacts").select("id", head).eq("tenant_id", tenantId),
    sb.from("tenant_users").select("id", head).eq("tenant_id", tenantId),
    sb.from("websites").select("id", head).eq("tenant_id", tenantId),
    sb.from("ai_usage_events").select("units").eq("tenant_id", tenantId).gte("created_at", monthStart.toISOString()),
  ]);
  const aiUnits = (ai.data ?? []).reduce((n: number, r: any) => n + (r.units ?? 0), 0);
  return { contacts: c.count ?? 0, seats: s.count ?? 0, websites: w.count ?? 0, ai_credits: aiUnits };
}

// ── Subscriptions ──────────────────────────────────────────────────────────────
export async function listSubscriptions(tenantId: string): Promise<SubscriptionRow[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
  if (error) return [];
  const rows = data ?? [];

  // resolve plan + contact names in two batched queries
  const planIds = [...new Set(rows.map((r: any) => r.plan_id).filter(Boolean))];
  const contactIds = [...new Set(rows.map((r: any) => r.contact_id).filter(Boolean))];
  const planMap = new Map<string, { name: string; amount: number; interval: SubInterval }>();
  const contactMap = new Map<string, string>();
  if (planIds.length) {
    const { data: p } = await sb.from("subscription_plans").select("id,name,amount_cents,interval").in("id", planIds);
    for (const r of p ?? []) planMap.set((r as any).id, { name: (r as any).name, amount: (r as any).amount_cents ?? 0, interval: ((r as any).interval ?? "month") as SubInterval });
  }
  if (contactIds.length) {
    const { data: c } = await sb.from("tenant_contacts").select("id,name,email,phone").in("id", contactIds);
    for (const r of c ?? []) {
      const nm = ((r as any).name || "").trim() || (r as any).email || (r as any).phone || "—";
      contactMap.set((r as any).id, nm);
    }
  }

  return rows.map((r: any) => {
    const plan = r.plan_id ? planMap.get(r.plan_id) : undefined;
    const interval = (plan?.interval ?? "month") as SubInterval;
    const amountCents = typeof r.amount_cents === "number" ? r.amount_cents : (plan?.amount ?? null);
    const status = (r.status ?? "trialing") as SubStatus;
    const state = rollUp(status, r.trial_ends_at ?? null, r.current_period_end ?? null);
    const dueDate = status === "trialing" || status === "pending" ? (r.trial_ends_at ?? null)
      : status === "canceled" || status === "comp" ? null : (r.current_period_end ?? null);
    const monthlyCents = status === "comp" || amountCents === null ? 0 : toMonthly(amountCents, interval);
    return {
      id: r.id, contactId: r.contact_id ?? null, contactName: (r.contact_id && contactMap.get(r.contact_id)) || "—",
      planId: r.plan_id ?? null, planName: plan?.name ?? "—",
      status, state, amountCents, monthlyCents, interval,
      startedAt: r.started_at ?? null, trialEndsAt: r.trial_ends_at ?? null, currentPeriodEnd: r.current_period_end ?? null,
      canceledAt: r.canceled_at ?? null, dueDate, daysLeft: daysUntil(dueDate),
    } satisfies SubscriptionRow;
  });
}

/** Subscribe a contact to a plan → a new ORDER (trialing if the plan has a trial, else pending). */
export async function createSubscription(tenantId: string, opts: { contactId: string; planId: string }): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data: plan } = await sb.from("subscription_plans").select("amount_cents,trial_days").eq("id", opts.planId).eq("tenant_id", tenantId).maybeSingle();
  const trialDays = (plan as any)?.trial_days ?? 0;
  const status: SubStatus = trialDays > 0 ? "trialing" : "pending";
  const trialEnds = trialDays > 0 ? new Date(Date.now() + trialDays * 86_400_000).toISOString() : null;
  const { error } = await sb.from("tenant_subscriptions").insert({
    tenant_id: tenantId, plan_id: opts.planId, contact_id: opts.contactId,
    status, amount_cents: (plan as any)?.amount_cents ?? null, started_at: new Date().toISOString(), trial_ends_at: trialEnds,
  });
  if (error) throw new Error(error.message);
}

async function patchSub(tenantId: string, id: string, patch: Record<string, unknown>): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_subscriptions").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}

/** Convert an order/trial into a paying RECURRING client: active + first period end set. */
export async function activateSubscription(tenantId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data: sub } = await sb.from("tenant_subscriptions").select("plan_id").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  let interval: SubInterval = "month";
  if ((sub as any)?.plan_id) {
    const { data: plan } = await sb.from("subscription_plans").select("interval").eq("id", (sub as any).plan_id).maybeSingle();
    interval = ((plan as any)?.interval ?? "month") as SubInterval;
  }
  await patchSub(tenantId, id, { status: "active", current_period_end: addInterval(new Date(), interval), canceled_at: null });
}

/** Record a renewal payment: push the period end forward one interval, status active. */
export async function renewSubscription(tenantId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data: sub } = await sb.from("tenant_subscriptions").select("plan_id,current_period_end").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  let interval: SubInterval = "month";
  if ((sub as any)?.plan_id) {
    const { data: plan } = await sb.from("subscription_plans").select("interval").eq("id", (sub as any).plan_id).maybeSingle();
    interval = ((plan as any)?.interval ?? "month") as SubInterval;
  }
  const base = (sub as any)?.current_period_end ? new Date(Math.max(new Date((sub as any).current_period_end).getTime(), Date.now())) : new Date();
  await patchSub(tenantId, id, { status: "active", current_period_end: addInterval(base, interval) });
}

export async function extendSubscriptionTrial(tenantId: string, id: string, days: number): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_subscriptions").select("trial_ends_at").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  const base = (data as any)?.trial_ends_at ? new Date((data as any).trial_ends_at).getTime() : 0;
  const next = new Date(Math.max(base, Date.now()) + days * 86_400_000).toISOString();
  await patchSub(tenantId, id, { status: "trialing", trial_ends_at: next });
}

export async function compSubscription(tenantId: string, id: string, comp: boolean): Promise<void> {
  await patchSub(tenantId, id, { status: comp ? "comp" : "active" });
}
export async function setSubscriptionStatus(tenantId: string, id: string, status: SubStatus): Promise<void> {
  await patchSub(tenantId, id, { status, ...(status === "canceled" ? { canceled_at: new Date().toISOString() } : {}) });
}
export async function changeSubscriptionPlan(tenantId: string, id: string, planId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { data: plan } = await sb.from("subscription_plans").select("amount_cents").eq("id", planId).eq("tenant_id", tenantId).maybeSingle();
  await patchSub(tenantId, id, { plan_id: planId, amount_cents: (plan as any)?.amount_cents ?? null });
}
export async function setSubscriptionAmount(tenantId: string, id: string, cents: number | null): Promise<void> {
  await patchSub(tenantId, id, { amount_cents: cents });
}
export async function deleteSubscription(tenantId: string, id: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_subscriptions").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) throw new Error(error.message);
}
