import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Usage + cost metering (D-334/335). Records what each billable action COST us (provider_cost)
 * and what we CHARGE the tenant (billable_amount = cost × markup) into ai_usage_events.
 * MVP charging model: meter + display now, bill later (no auto-charge — drafts-only). The Usage
 * view estimates cost from units for older events that predate cost capture.
 */

const svc = () => createSupabaseServiceClient();

/** Platform markup applied to provider cost. Per-tenant override = future (entitlements config). */
export const MARKUP_PERCENT = Number(process.env.METERING_MARKUP_PERCENT ?? 30);

/** Estimated per-unit provider cost (USD) by event kind — used when an event didn't capture exact cost. */
const UNIT_COST: { test: RegExp; cost: number; label: string }[] = [
  { test: /whatsapp/i, cost: 0.005, label: "WhatsApp" },
  { test: /sms/i, cost: 0.0079, label: "SMS" },
  { test: /email/i, cost: 0.0004, label: "Email" },
  { test: /(voice|call)/i, cost: 0.013, label: "Voice" },
  { test: /(ai|agent|token|llm|draft|generate|content)/i, cost: 0.002, label: "AI" },
];
function classify(kind: string): { cost: number; label: string } {
  return UNIT_COST.find((u) => u.test.test(kind)) ?? { cost: 0, label: "Other" };
}
const round4 = (n: number) => Math.round(n * 10000) / 10000;
export function withMarkup(cost: number): number { return round4(cost * (1 + MARKUP_PERCENT / 100)); }

/** Record a billable usage event with cost + billable amount. Best-effort (no-throw). */
export async function recordUsage(tenantId: string, e: { kind: string; units: number; providerCost?: number; meta?: Record<string, unknown> }): Promise<void> {
  const providerCost = e.providerCost != null ? round4(e.providerCost) : round4(e.units * classify(e.kind).cost);
  try {
    await svc().from("ai_usage_events").insert({
      tenant_id: tenantId, kind: e.kind, units: e.units,
      provider_cost: providerCost, billable_amount: withMarkup(providerCost), currency: "USD", meta: e.meta ?? {},
    });
  } catch { /* table not applied / cost columns missing — metering is best-effort */ }
}

export interface UsageRow { category: string; kinds: string[]; units: number; providerCost: number; billable: number; }
export interface UsageSummary { monthLabel: string; rows: UsageRow[]; totals: { providerCost: number; billable: number }; markupPercent: number; }

/** Aggregate this month's usage by category (SMS / Email / WhatsApp / AI / …). Estimates cost
 *  from units for events that lack captured cost, so the view is meaningful immediately. */
export async function usageSummary(tenantId: string, monthStartIso?: string): Promise<UsageSummary> {
  const start = monthStartIso ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthLabel = new Date(start).toLocaleString("en", { month: "long", year: "numeric" });
  let rows: any[] = [];
  try {
    const { data } = await svc().from("ai_usage_events").select("kind, units, provider_cost, billable_amount").eq("tenant_id", tenantId).gte("created_at", start);
    rows = data ?? [];
  } catch { rows = []; }

  const byCat = new Map<string, UsageRow>();
  for (const r of rows) {
    const { label, cost } = classify(String(r.kind));
    const units = Number(r.units) || 0;
    const pc = Number(r.provider_cost) > 0 ? Number(r.provider_cost) : round4(units * cost);
    const bill = Number(r.billable_amount) > 0 ? Number(r.billable_amount) : withMarkup(pc);
    const cur = byCat.get(label) ?? { category: label, kinds: [], units: 0, providerCost: 0, billable: 0 };
    cur.units += units; cur.providerCost = round4(cur.providerCost + pc); cur.billable = round4(cur.billable + bill);
    if (!cur.kinds.includes(String(r.kind))) cur.kinds.push(String(r.kind));
    byCat.set(label, cur);
  }
  const out = [...byCat.values()].sort((a, b) => b.billable - a.billable);
  return {
    monthLabel,
    rows: out,
    totals: { providerCost: round4(out.reduce((s, r) => s + r.providerCost, 0)), billable: round4(out.reduce((s, r) => s + r.billable, 0)) },
    markupPercent: MARKUP_PERCENT,
  };
}
