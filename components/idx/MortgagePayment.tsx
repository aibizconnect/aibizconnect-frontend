"use client";

import { useMemo, useState } from "react";

/**
 * Mortgage payment estimator for the listing detail surface (D-361). Self-contained: down payment,
 * rate, and amortization are visitor-editable and the payment recomputes as they type. Canadian
 * convention — semi-annual compounding, so the effective monthly rate is (1 + r/2)^(1/6) - 1.
 */
export default function MortgagePayment({ price, accent, currency = "CAD" }: { price: number | null; accent: string; currency?: string }) {
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(4.79);
  const [years, setYears] = useState(25);

  const money = (n: number) => {
    try { return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
    catch { return `$${Math.round(n).toLocaleString()}`; }
  };

  const monthly = useMemo(() => {
    if (!price || price <= 0) return null;
    const principal = price * (1 - downPct / 100);
    if (principal <= 0) return 0;
    const n = years * 12;
    const i = Math.pow(1 + rate / 100 / 2, 1 / 6) - 1; // semi-annual compounding → monthly
    if (i <= 0) return principal / n;
    return (principal * i) / (1 - Math.pow(1 + i, -n));
  }, [price, downPct, rate, years]);

  if (!price || price <= 0) return null;

  const row = "flex items-center justify-between gap-3 text-sm";
  const inp = "w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">Estimate your payment</div>
      <div className="mt-3 space-y-2">
        <label className={row}>
          <span className="text-slate-500">Down payment</span>
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={100} step={1} value={downPct} onChange={(e) => setDownPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className={inp} />
            <span className="text-xs text-slate-400">%</span>
          </span>
        </label>
        <label className={row}>
          <span className="text-slate-500">Interest rate</span>
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={25} step={0.01} value={rate} onChange={(e) => setRate(Math.min(25, Math.max(0, Number(e.target.value) || 0)))} className={inp} />
            <span className="text-xs text-slate-400">%</span>
          </span>
        </label>
        <label className={row}>
          <span className="text-slate-500">Amortization</span>
          <span className="flex items-center gap-1">
            <select value={years} onChange={(e) => setYears(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {[10, 15, 20, 25, 30].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <span className="text-xs text-slate-400">yrs</span>
          </span>
        </label>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-center">
        <div className="text-[11px] uppercase tracking-wide text-slate-400">Estimated monthly payment</div>
        <div className="text-2xl font-bold" style={{ color: accent }}>{monthly != null ? money(monthly) : "—"}</div>
        <div className="mt-1 text-[11px] text-slate-400">Principal &amp; interest on {money(price * (1 - downPct / 100))}. Taxes, condo fees and insurance not included.</div>
      </div>
    </div>
  );
}
