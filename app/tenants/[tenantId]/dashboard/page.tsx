import Link from "next/link";
import { getLaunchpadState, type LaunchpadState } from "../launchpad/actions";
import { buildReport, buildDashboard, type DashboardData, type Report } from "@/lib/reporting";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import AskAibizDrawer from "@/components/dashboard/AskAibizDrawer";

/**
 * Tenant dashboard — restyled to the Claude Design handoff Overview (D-391), themed under `.abc-ds`.
 * KPI cards + AIBiz suggestions + activity chart + recent activity, all wired to REAL aggregates
 * (buildDashboard/buildReport) — no fabricated metrics. The existing LeftNav (real navigation) and
 * all wired modules are untouched; this restyles the dashboard landing only.
 */

const sw = (n: number) => n as unknown as number;
async function safe<T>(fn: () => Promise<T>): Promise<T | null> { try { return await fn(); } catch { return null; } }
const money = (n: number) => "$" + Math.round(n).toLocaleString();

export default async function DashboardPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const base = `/tenants/${tenantId}`;
  const [launchpad, dashboard, report, tenantName] = await Promise.all([
    safe<LaunchpadState>(() => getLaunchpadState(tenantId)),
    safe<DashboardData>(() => buildDashboard(tenantId)),
    safe<Report>(() => buildReport(tenantId)),
    safe<string>(async () => {
      const sb = createSupabaseServiceClient();
      const { data } = await sb.from("tenants").select("name").eq("id", tenantId).maybeSingle();
      return (data?.name as string) || "";
    }),
  ]);

  const k = dashboard?.kpis;
  const cm = dashboard?.contactsByMonth ?? [];
  const rm = dashboard?.revenueByMonth ?? [];
  const delta = (arr: { count?: number; amount?: number }[], key: "count" | "amount") => {
    if (arr.length < 2) return null;
    const last = Number(arr[arr.length - 1]?.[key] ?? 0);
    const prev = Number(arr[arr.length - 2]?.[key] ?? 0);
    if (!prev) return last > 0 ? "▲ new this month" : null;
    const pct = Math.round(((last - prev) / prev) * 100);
    return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last month`;
  };

  const kpis = [
    { label: "Contacts", value: (k?.contacts ?? 0).toLocaleString(), delta: delta(cm, "count") },
    { label: "Open deals", value: (k?.oppsOpen ?? 0).toLocaleString(), delta: k?.pipelineValue ? `${money(k.pipelineValue)} in pipeline` : null },
    { label: "Upcoming bookings", value: (k?.appointments ?? 0).toLocaleString(), delta: null },
    { label: "Revenue collected", value: money(k?.collected ?? 0), delta: delta(rm, "amount") },
  ];

  // AIBiz suggestions — derived from REAL state (no fabricated AI output).
  const suggestions: { t: string; d: string; cta: string; href: string }[] = [];
  const nextStep = launchpad?.steps?.find((s) => !s.optional && s.status !== "complete" && s.status !== "skipped");
  if (nextStep) suggestions.push({ t: `Finish setup: ${nextStep.title}`, d: `You're ${launchpad?.progress ?? 0}% set up. Knock out the next step to go live.`, cta: "Continue", href: nextStep.route });
  if ((report?.sitesPublished ?? 0) === 0) suggestions.push({ t: "Publish your website", d: "Your site is a private draft. Review it and publish when it's ready.", cta: "Open editor", href: `${base}/website` });
  if ((k?.contacts ?? 0) > 0 && (k?.oppsOpen ?? 0) === 0) suggestions.push({ t: "Turn contacts into deals", d: `You have ${k?.contacts} contact${k?.contacts === 1 ? "" : "s"} and no open opportunities yet.`, cta: "Open pipeline", href: `${base}/pipelines` });
  if (suggestions.length === 0) suggestions.push({ t: "You're all set 🎉", d: "Your platform is live. Ask AIBiz to draft posts or follow up with leads.", cta: "View pipeline", href: `${base}/pipelines` });

  const maxC = Math.max(1, ...cm.map((m) => m.count));
  const recent = report?.recent ?? [];
  const ACT: Record<string, string> = { contact: "👤", booking: "📅", review: "⭐" };

  const cardBase: React.CSSProperties = { background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 18, boxShadow: "var(--shadow-xs)" };
  const sectionTitle: React.CSSProperties = { fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-md)", color: "var(--navy-900)" };

  return (
    <div className="abc-ds" style={{ color: "var(--text-body)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Your business at a glance</div>
          <h1 style={{ fontSize: "var(--text-2xl)", color: "var(--navy-900)", marginTop: 2 }}>Welcome back{tenantName ? `, ${tenantName}` : ""}</h1>
        </div>
        <Link href={`${base}/pipelines`} style={{ height: 40, padding: "0 16px", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: sw(600), fontSize: "var(--text-sm)", display: "inline-flex", alignItems: "center", boxShadow: "var(--shadow-brand)", textDecoration: "none" }}>View pipeline →</Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {kpis.map((c) => (
            <div key={c.label} style={cardBase}>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", color: "var(--navy-900)" }}>{c.value}</div>
              {c.delta && <div style={{ fontSize: "var(--text-xs)", fontWeight: sw(600), color: "var(--green-600)", marginTop: 4 }}>{c.delta}</div>}
            </div>
          ))}
        </div>

        {/* AI suggestions + activity chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ background: "linear-gradient(160deg, var(--navy-900), var(--blue-700))", borderRadius: "var(--radius-xl)", padding: 22, color: "#fff", boxShadow: "var(--shadow-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✨</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-md)", color: "#fff" }}>AIBiz suggested {suggestions.length} thing{suggestions.length === 1 ? "" : "s"}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--blue-200)" }}>Based on your live setup &amp; data</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {suggestions.slice(0, 3).map((x, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "var(--radius-md)", padding: 14 }}>
                  <div style={{ fontWeight: sw(600), fontSize: "var(--text-sm)", color: "#fff", marginBottom: 4 }}>{x.t}</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--blue-200)", lineHeight: 1.5, marginBottom: 11 }}>{x.d}</div>
                  <Link href={x.href} style={{ display: "inline-block", padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "#fff", color: "var(--navy-900)", fontWeight: sw(600), fontSize: "var(--text-xs)", textDecoration: "none" }}>{x.cta}</Link>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardBase, borderRadius: "var(--radius-xl)", padding: 22 }}>
            <div style={sectionTitle}>New contacts</div>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 20 }}>Last {cm.length || 6} months</div>
            {cm.length ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 150 }}>
                {cm.map((b, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
                    <div style={{ width: "100%", height: `${Math.max(4, (b.count / maxC) * 100)}%`, background: "var(--gradient-brand)", borderRadius: "6px 6px 3px 3px" }} />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: sw(600) }}>{b.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", padding: "30px 0", textAlign: "center" }}>Contacts will chart here as they come in.</div>
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ ...cardBase, borderRadius: "var(--radius-xl)", padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={sectionTitle}>Recent activity</div>
            <Link href={`${base}/contacts`} style={{ fontSize: "var(--text-sm)", fontWeight: sw(600), color: "var(--color-primary)", textDecoration: "none" }}>View all →</Link>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: 22, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>No activity yet — it&apos;ll appear here as contacts, bookings and reviews come in.</div>
          ) : recent.slice(0, 6).map((a, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: "1px solid var(--gray-100)" }}>
              <span style={{ fontSize: 18 }}>{ACT[a.kind] ?? "•"}</span>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.at ? new Date(a.at).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</span>
            </div>
          ))}
        </div>
      </div>

      <AskAibizDrawer />
    </div>
  );
}
