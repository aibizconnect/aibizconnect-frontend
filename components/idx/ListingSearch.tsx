"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Class-tabbed IDX search (myRealPage-style, Ali's ask): pick the property class first
 * (Residential · Condo & Other · Commercial) and only its relevant filters show — much easier
 * than one flat form. Submits as query params to the listings page (SSR filters).
 */
const CLASSES = ["Residential", "Condo & Other", "Commercial"] as const;
type Cls = (typeof CLASSES)[number];

const inp = "rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

export default function ListingSearch({ tenantId, accent, initial }: { tenantId: string; accent: string; initial?: Record<string, string> }) {
  const router = useRouter();
  const [cls, setCls] = useState<Cls>((CLASSES.includes(initial?.class as Cls) ? initial?.class : "Residential") as Cls);
  const [tx, setTx] = useState(initial?.t || "For Sale");
  const [city, setCity] = useState(initial?.city || "");
  const [min, setMin] = useState(initial?.min || "");
  const [max, setMax] = useState(initial?.max || "");
  const [beds, setBeds] = useState(initial?.beds || "");
  const [baths, setBaths] = useState(initial?.baths || "");
  const [maxFee, setMaxFee] = useState(initial?.fee || "");
  // commercial (only the fields CREA DDF reliably populates — property use + building sqft;
  // zoning / # units / lot come from the TRREB direct feed, not the national DDF)
  const [use, setUse] = useState(initial?.use || "");
  const [sqft, setSqft] = useState(initial?.sqft || "");

  function search() {
    const q = new URLSearchParams();
    q.set("class", cls); if (tx) q.set("t", tx);
    if (city.trim()) q.set("city", city.trim());
    if (min) q.set("min", min); if (max) q.set("max", max);
    if (cls !== "Commercial") { if (beds) q.set("beds", beds); if (baths) q.set("baths", baths); }
    if (cls === "Condo & Other" && maxFee) q.set("fee", maxFee);
    if (cls === "Commercial") {
      if (use) q.set("use", use);
      if (sqft) q.set("sqft", sqft);
    }
    router.push(`/sites/${tenantId}/listings?${q.toString()}`);
  }
  const num = ["Any", "1", "2", "3", "4", "5"];
  // CREA commercial PropertyType values (ilike-matched server-side; "Multi" catches Multi-family/Multi Family).
  const USES: { label: string; value: string }[] = [
    { label: "Any use", value: "" }, { label: "Retail", value: "Retail" }, { label: "Office", value: "Office" },
    { label: "Industrial", value: "Industrial" }, { label: "Business", value: "Business" }, { label: "Multi-family", value: "Multi" },
    { label: "Hospitality", value: "Hospitality" }, { label: "Agriculture", value: "Agriculture" }, { label: "Vacant land", value: "Land" },
  ];

  return (
    <div style={{ ["--accent" as string]: accent }}>
      {/* class tabs */}
      <div className="flex gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 p-1">
        {CLASSES.map((c) => (
          <button key={c} onClick={() => setCls(c)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${cls === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`} style={cls === c ? { color: accent } : undefined}>{c}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2 rounded-b-lg rounded-tr-lg border border-slate-200 bg-white p-3">
        <label className="flex flex-col gap-0.5 text-xs text-slate-500">Sale / Lease
          <select value={tx} onChange={(e) => setTx(e.target.value)} className={inp}><option>For Sale</option><option>For Lease</option></select></label>
        <label className="flex flex-col gap-0.5 text-xs text-slate-500">City / area
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Toronto" className={`${inp} w-40`} /></label>
        <label className="flex flex-col gap-0.5 text-xs text-slate-500">Min $
          <input value={min} onChange={(e) => setMin(e.target.value)} type="number" className={`${inp} w-28`} /></label>
        <label className="flex flex-col gap-0.5 text-xs text-slate-500">Max $
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" className={`${inp} w-28`} /></label>

        {cls !== "Commercial" && (
          <>
            <label className="flex flex-col gap-0.5 text-xs text-slate-500">Beds
              <select value={beds} onChange={(e) => setBeds(e.target.value)} className={inp}>{num.map((n) => <option key={n} value={n === "Any" ? "" : n}>{n === "Any" ? "Any" : `${n}+`}</option>)}</select></label>
            <label className="flex flex-col gap-0.5 text-xs text-slate-500">Baths
              <select value={baths} onChange={(e) => setBaths(e.target.value)} className={inp}>{num.map((n) => <option key={n} value={n === "Any" ? "" : n}>{n === "Any" ? "Any" : `${n}+`}</option>)}</select></label>
          </>
        )}
        {cls === "Condo & Other" && (
          <label className="flex flex-col gap-0.5 text-xs text-slate-500">Max condo fee $
            <input value={maxFee} onChange={(e) => setMaxFee(e.target.value)} type="number" className={`${inp} w-28`} /></label>
        )}
        {cls === "Commercial" && (
          <>
            <label className="flex flex-col gap-0.5 text-xs text-slate-500">Property use
              <select value={use} onChange={(e) => setUse(e.target.value)} className={inp}>{USES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}</select></label>
            <label className="flex flex-col gap-0.5 text-xs text-slate-500">Min sq ft
              <input value={sqft} onChange={(e) => setSqft(e.target.value)} type="number" placeholder="e.g. 2000" className={`${inp} w-32`} /></label>
          </>
        )}

        <button onClick={search} className="rounded-lg px-5 py-2 text-sm font-semibold text-white" style={{ background: accent }}>Search</button>
      </div>
    </div>
  );
}
