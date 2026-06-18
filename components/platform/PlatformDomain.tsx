"use client";

import { useCallback, useEffect, useState } from "react";
import { platformApexStatus, claimPlatformApex, type PlatformApexStatus } from "@/app/tenants/[tenantId]/settings/domain-actions";

/**
 * Platform-domain control: make `aibizconnect.app` + `www` serve OUR deployment. Shows live
 * attach state per host and runs the switch (claimPlatformApex). Requires the Vercel + Cloudflare
 * tokens to fully apply; degrades to a clear "token not set" state otherwise. Superadmin only.
 */
function Dot({ ok, warn }: { ok: boolean; warn?: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-slate-300"}`} />;
}

export default function PlatformDomain() {
  const [status, setStatus] = useState<PlatformApexStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setStatus(await platformApexStatus()); } catch (e: any) { setErr(e?.message ?? "Could not load status."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const r = await claimPlatformApex();
      setMsg(r.results.map((x) => `${x.ok ? "✓" : "✗"} ${x.host}: ${x.message}`).join("\n"));
      await load();
    } catch (e: any) { setErr(e?.message ?? "Switch failed."); }
    setBusy(false);
  };

  const blocked = !status?.vercelConfigured;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><Dot ok={!!status?.vercelConfigured} /> Vercel token {status?.vercelConfigured ? "set" : "missing"}</span>
        <span className="flex items-center gap-1.5"><Dot ok={!!status?.cloudflareConfigured} /> Cloudflare token {status?.cloudflareConfigured ? "set" : "missing"}</span>
      </div>

      <div className="mt-3 space-y-1.5">
        {(status?.hosts ?? []).map((h) => {
          const ours = h.registered && h.misconfigured !== true;
          return (
            <div key={h.host} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-sm">
              <span className="font-mono text-slate-700">{h.host}</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Dot ok={ours} warn={h.registered && h.misconfigured === true} />
                {h.note ? h.note : ours ? "attached" : h.registered ? "attached · DNS pending" : "not attached"}
              </span>
            </div>
          );
        })}
      </div>

      {(msg || err) && <pre className={`mt-3 whitespace-pre-wrap rounded-lg border px-3 py-2 text-xs ${err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{err || msg}</pre>}

      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={busy || blocked} onClick={run}
          className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {busy ? "Switching…" : "Make aibizconnect.app ours"}
        </button>
        <button type="button" disabled={busy} onClick={load} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Refresh</button>
        {blocked && <span className="text-xs text-amber-600">Add VERCEL_API_TOKEN to enable the switch.</span>}
      </div>
    </div>
  );
}
