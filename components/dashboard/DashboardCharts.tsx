"use client";

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import type { DashboardData } from "@/lib/reporting";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);
ChartJS.defaults.font.family = "system-ui, -apple-system, sans-serif";
ChartJS.defaults.color = "#64748b";

const money = (n: number) => `$${(n || 0).toLocaleString()}`;
const NAVY = "#1e3a8a";
const PIE = ["#1e3a8a", "#22d3ee", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e"];

function Card({ title, children, sub }: { title: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 text-sm font-semibold text-slate-800">{title}</div>
      {sub && <div className="mb-3 text-xs text-slate-400">{sub}</div>}
      <div className="h-[220px]">{children}</div>
    </div>
  );
}

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const k = data.kpis;
  const kpis = [
    { label: "Contacts", value: k.contacts.toLocaleString(), tint: "text-slate-900" },
    { label: "Open pipeline", value: money(k.pipelineValue), tint: "text-slate-900", sub: `${k.oppsOpen} open deals` },
    { label: "Won revenue", value: money(k.wonValue), tint: "text-emerald-600" },
    { label: "Collected", value: money(k.collected), tint: "text-emerald-600", sub: "payments received" },
    { label: "Upcoming bookings", value: k.appointments.toLocaleString(), tint: "text-slate-900" },
    { label: "Avg rating", value: k.avgRating ? `${k.avgRating}★` : "—", tint: "text-amber-500", sub: `${k.reviewCount} reviews` },
  ];

  const axis = { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } } } as const;
  const moneyAxis = { ...axis, scales: { ...axis.scales, y: { ...axis.scales.y, ticks: { callback: (v: any) => money(Number(v)) } } } } as const;

  const hasPipeline = data.pipelineByStage.length > 0;
  const hasSources = data.sources.length > 0;
  const oppTotal = data.oppStatus.open + data.oppStatus.won + data.oppStatus.lost;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${c.tint}`}>{c.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">{c.sub ?? " "}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Pipeline by stage" sub="open opportunity value">
          {hasPipeline ? (
            <Bar data={{ labels: data.pipelineByStage.map((s) => s.stage), datasets: [{ label: "Value", data: data.pipelineByStage.map((s) => s.value), backgroundColor: NAVY, borderRadius: 6 }] }} options={moneyAxis} />
          ) : <Empty />}
        </Card>

        <Card title="Revenue collected" sub="last 6 months">
          <Line data={{ labels: data.revenueByMonth.map((m) => m.label), datasets: [{ data: data.revenueByMonth.map((m) => m.amount), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)", fill: true, tension: 0.35, pointRadius: 3 }] }} options={moneyAxis} />
        </Card>

        <Card title="New contacts" sub="last 6 months">
          <Bar data={{ labels: data.contactsByMonth.map((m) => m.label), datasets: [{ data: data.contactsByMonth.map((m) => m.count), backgroundColor: "#22d3ee", borderRadius: 6 }] }} options={axis} />
        </Card>

        <Card title="Opportunities" sub="by status">
          {oppTotal > 0 ? (
            <Doughnut data={{ labels: ["Open", "Won", "Lost"], datasets: [{ data: [data.oppStatus.open, data.oppStatus.won, data.oppStatus.lost], backgroundColor: ["#1e3a8a", "#10b981", "#f43f5e"], borderWidth: 0 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { position: "right" } }, cutout: "62%" }} />
          ) : <Empty />}
        </Card>

        {hasSources && (
          <Card title="Lead sources" sub="where contacts come from">
            <Doughnut data={{ labels: data.sources.map((s) => s.source), datasets: [{ data: data.sources.map((s) => s.count), backgroundColor: PIE, borderWidth: 0 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { position: "right" } }, cutout: "62%" }} />
          </Card>
        )}
      </div>
    </div>
  );
}

function Empty() { return <div className="grid h-full place-items-center text-sm text-slate-400">No data yet</div>; }
