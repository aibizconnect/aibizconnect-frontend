import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Reporting — pure read-only aggregation across the whole platform (no DDL, no writes).
 * The capstone dashboard: surfaces the real data every other module now produces. Every
 * query is guarded so a not-yet-applied table never breaks the page.
 */
function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export interface ActivityItem { kind: string; label: string; at: string; }
export interface Report {
  contacts: number;
  opportunities: { count: number; value: number; byStage: { stage: string; count: number; value: number }[] };
  appointmentsUpcoming: number;
  reviews: { count: number; avg: number };
  sitesPublished: number;
  funnels: number;
  workflows: { total: number; published: number };
  recent: ActivityItem[];
}

export async function buildReport(tenantId: string): Promise<Report> {
  const sb = service();
  const now = new Date().toISOString();

  const [contacts, opps, appointmentsUpcoming, reviews, sitesPublished, funnels, workflows, recentContacts, recentAppts, recentReviews] = await Promise.all([
    safe(async () => (await sb.from("tenant_contacts").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId)).count ?? 0, 0),
    safe(async () => {
      const { data } = await sb.from("tenant_opportunities").select("value,stage,status").eq("tenant_id", tenantId);
      const open = (data ?? []).filter((r: any) => r.status === "open");
      const map = new Map<string, { count: number; value: number }>();
      for (const r of open) { const m = map.get(r.stage) ?? { count: 0, value: 0 }; m.count++; m.value += Number(r.value) || 0; map.set(r.stage, m); }
      return { count: open.length, value: open.reduce((a: number, r: any) => a + (Number(r.value) || 0), 0), byStage: [...map.entries()].map(([stage, v]) => ({ stage, ...v })) };
    }, { count: 0, value: 0, byStage: [] as { stage: string; count: number; value: number }[] }),
    safe(async () => (await sb.from("tenant_appointments").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "booked").gte("start_at", now)).count ?? 0, 0),
    safe(async () => {
      const { data } = await sb.from("tenant_reviews").select("rating").eq("tenant_id", tenantId).eq("status", "published");
      const rows = data ?? [];
      return { count: rows.length, avg: rows.length ? Math.round((rows.reduce((a: number, r: any) => a + r.rating, 0) / rows.length) * 10) / 10 : 0 };
    }, { count: 0, avg: 0 }),
    safe(async () => (await sb.from("website_pages").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("is_public", true).is("funnel_id", null)).count ?? 0, 0),
    safe(async () => (await sb.from("website_funnels").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId)).count ?? 0, 0),
    safe(async () => {
      const { data } = await sb.from("tenant_workflows").select("status").eq("tenant_id", tenantId);
      const rows = data ?? [];
      return { total: rows.length, published: rows.filter((r: any) => r.status === "published").length };
    }, { total: 0, published: 0 }),
    safe(async () => (await sb.from("tenant_contacts").select("name,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5)).data ?? [], [] as any[]),
    safe(async () => (await sb.from("tenant_appointments").select("name,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5)).data ?? [], [] as any[]),
    safe(async () => (await sb.from("tenant_reviews").select("author,rating,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5)).data ?? [], [] as any[]),
  ]);

  const recent: ActivityItem[] = [
    ...recentContacts.map((r: any) => ({ kind: "contact", label: `New contact: ${r.name || "Lead"}`, at: r.created_at })),
    ...recentAppts.map((r: any) => ({ kind: "booking", label: `Booking: ${r.name || "Guest"}`, at: r.created_at })),
    ...recentReviews.map((r: any) => ({ kind: "review", label: `${r.rating}★ review from ${r.author || "Anonymous"}`, at: r.created_at })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  return { contacts, opportunities: opps, appointmentsUpcoming, reviews, sitesPublished, funnels, workflows, recent };
}

// ── Dashboard charts (stats + graphs) ────────────────────────────────────────
export interface DashboardData {
  kpis: { contacts: number; oppsOpen: number; pipelineValue: number; wonValue: number; collected: number; appointments: number; avgRating: number; reviewCount: number };
  pipelineByStage: { stage: string; count: number; value: number }[];
  oppStatus: { open: number; won: number; lost: number };
  contactsByMonth: { label: string; count: number }[];
  revenueByMonth: { label: string; amount: number }[];
  sources: { source: string; count: number }[];
}

function lastMonths(n: number): { key: string; label: string }[] {
  const base = new Date();
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`, label: m.toLocaleString("en", { month: "short" }) });
  }
  return out;
}
const monthKey = (iso?: string) => (iso ? iso.slice(0, 7) : "");

export async function buildDashboard(tenantId: string): Promise<DashboardData> {
  const sb = service();
  const now = new Date().toISOString();
  const months = lastMonths(6);

  const [contactRows, oppRows, txnRows, appointments, reviews] = await Promise.all([
    safe(async () => (await sb.from("tenant_contacts").select("created_at, source").eq("tenant_id", tenantId).limit(5000)).data ?? [], [] as any[]),
    safe(async () => (await sb.from("tenant_opportunities").select("value, stage, status").eq("tenant_id", tenantId)).data ?? [], [] as any[]),
    safe(async () => (await sb.from("tenant_transactions").select("amount, type, created_at").eq("tenant_id", tenantId).eq("type", "payment")).data ?? [], [] as any[]),
    safe(async () => (await sb.from("tenant_appointments").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "booked").gte("start_at", now)).count ?? 0, 0),
    safe(async () => {
      const { data } = await sb.from("tenant_reviews").select("rating").eq("tenant_id", tenantId).eq("status", "published");
      const rows = data ?? [];
      return { count: rows.length, avg: rows.length ? Math.round((rows.reduce((a: number, r: any) => a + r.rating, 0) / rows.length) * 10) / 10 : 0 };
    }, { count: 0, avg: 0 }),
  ]);

  // Opportunities — open pipeline by stage, status split, won value.
  const stageMap = new Map<string, { count: number; value: number }>();
  let oppsOpen = 0, pipelineValue = 0, wonValue = 0;
  const oppStatus = { open: 0, won: 0, lost: 0 };
  for (const r of oppRows) {
    const v = Number(r.value) || 0;
    const st = (r.status as keyof typeof oppStatus) in oppStatus ? (r.status as keyof typeof oppStatus) : "open";
    oppStatus[st]++;
    if (r.status === "won") wonValue += v;
    if (r.status === "open") { oppsOpen++; pipelineValue += v; const m = stageMap.get(r.stage) ?? { count: 0, value: 0 }; m.count++; m.value += v; stageMap.set(r.stage, m); }
  }

  // Contacts by month + lead sources.
  const cMonth = new Map(months.map((m) => [m.key, 0]));
  const srcMap = new Map<string, number>();
  for (const r of contactRows) {
    const k = monthKey(r.created_at);
    if (cMonth.has(k)) cMonth.set(k, (cMonth.get(k) ?? 0) + 1);
    const s = String(r.source || "unknown").toLowerCase();
    srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
  }

  // Revenue collected by month.
  const rMonth = new Map(months.map((m) => [m.key, 0]));
  let collected = 0;
  for (const r of txnRows) {
    const amt = Number(r.amount) || 0;
    collected += amt;
    const k = monthKey(r.created_at);
    if (rMonth.has(k)) rMonth.set(k, (rMonth.get(k) ?? 0) + amt);
  }

  return {
    kpis: { contacts: contactRows.length, oppsOpen, pipelineValue, wonValue, collected, appointments, avgRating: reviews.avg, reviewCount: reviews.count },
    pipelineByStage: [...stageMap.entries()].map(([stage, v]) => ({ stage, ...v })),
    oppStatus,
    contactsByMonth: months.map((m) => ({ label: m.label, count: cMonth.get(m.key) ?? 0 })),
    revenueByMonth: months.map((m) => ({ label: m.label, amount: Math.round((rMonth.get(m.key) ?? 0) * 100) / 100 })),
    sources: [...srcMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([source, count]) => ({ source, count })),
  };
}
