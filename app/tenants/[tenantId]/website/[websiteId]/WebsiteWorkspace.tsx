"use client";

import { useState } from "react";
import PagesGrid from "../PagesGrid";
import WebsiteSettings from "./WebsiteSettings";
import OccasionsPanel from "./OccasionsPanel";
import SuggestedPagesPanel from "./SuggestedPagesPanel";
import type { SitePage } from "../actions";

/** Tabs that are live vs. still "soon". Pages + SEO & GEO + Occasions + Settings are wired. */
const TABS = ["Pages", "SEO & GEO", "Occasions", "Stats", "Sales", "Security", "Events", "Settings"] as const;
type Tab = (typeof TABS)[number];
const LIVE: Tab[] = ["Pages", "SEO & GEO", "Occasions", "Settings"];

export default function WebsiteWorkspace({
  tenantId, websiteId, pages, websiteName, subdomain, isPrimary, websiteCount, paidDomain,
}: {
  tenantId: string;
  websiteId: string;
  pages: SitePage[];
  websiteName?: string;
  subdomain?: string | null;
  isPrimary?: boolean;
  websiteCount?: number;
  paidDomain?: string | null;
}) {
  const [tab, setTab] = useState<Tab>("Pages");

  return (
    <>
      <div className="mb-6 flex gap-6 border-b border-slate-200 text-sm">
        {TABS.map((t) => {
          const live = LIVE.includes(t);
          const active = t === tab;
          return (
            <button
              key={t}
              type="button"
              disabled={!live}
              onClick={() => live && setTab(t)}
              className={
                active
                  ? "border-b-2 border-[#1e3a8a] pb-2 font-semibold text-[#1e3a8a]"
                  : live
                    ? "pb-2 text-slate-600 hover:text-[#1e3a8a]"
                    : "pb-2 text-slate-400 cursor-not-allowed"
              }
            >
              {t}
              {!live && <span className="ml-1 text-[10px] uppercase tracking-wide text-slate-300">soon</span>}
            </button>
          );
        })}
      </div>

      {tab === "Pages" && (
        <>
          <SuggestedPagesPanel tenantId={tenantId} websiteId={websiteId} />
          <PagesGrid tenantId={tenantId} initial={pages} websiteId={websiteId} />
        </>
      )}
      {tab === "SEO & GEO" && (
        paidDomain ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">SEO + GEO (AI/answer-engine) readiness for your connected domain <b className="text-slate-700">{paidDomain}</b>, with a prioritized task list.</p>
              <a href={`/tools/seo-geo-analyzer.html?url=${encodeURIComponent(paidDomain)}&lock=1`} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#1e3a8a] hover:underline">Open full screen ↗</a>
            </div>
            <iframe src={`/tools/seo-geo-analyzer.html?url=${encodeURIComponent(paidDomain)}&lock=1`} title="SEO & GEO Analyzer"
              className="w-full rounded-xl border border-slate-200 bg-white" style={{ height: "calc(100vh - 220px)", minHeight: 640 }} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <h3 className="text-base font-semibold text-slate-800">Connect your domain first</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">SEO &amp; GEO analysis runs on your own connected (paid) domain. Add your domain in <b>Settings</b>, then come back to analyze it.</p>
            <button onClick={() => setTab("Settings")} className="mt-4 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Go to Settings</button>
          </div>
        )
      )}
      {tab === "Occasions" && <OccasionsPanel tenantId={tenantId} />}
      {tab === "Settings" && <WebsiteSettings tenantId={tenantId} websiteId={websiteId} websiteName={websiteName}
        subdomain={subdomain} isPrimary={isPrimary} websiteCount={websiteCount} />}
    </>
  );
}
