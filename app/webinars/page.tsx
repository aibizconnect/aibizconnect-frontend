import type { Metadata } from "next";
import ResourceListPage from "@/components/marketing/abc/ResourceListPage";

export const metadata: Metadata = { title: "Webinars — AIBizConnect OS", description: "Live and on-demand sessions with the AIBizConnect team — build, automate, and grow your business." };

export default function WebinarsPage() {
  return <ResourceListPage d={{
    eyebrow: "Webinars", title: "Learn live with our team", sub: "Live and on-demand sessions to help you launch fast and grow on AIBizConnect OS.",
    items: [
      { title: "Build your business in 30 minutes, live", blurb: "Watch us go from sign-up to a published platform in real time.", tag: "Live", meta: "Every Thursday" },
      { title: "AI concierge masterclass", blurb: "Set up an assistant that qualifies and books in your voice.", tag: "On-demand", meta: "45 min" },
      { title: "Automations deep-dive", blurb: "Build nurture flows that recover leads while you sleep.", tag: "On-demand", meta: "38 min" },
      { title: "For agencies: running many client brands", blurb: "White-label sub-accounts, roles, and roll-up reporting.", tag: "On-demand", meta: "52 min" },
      { title: "From spreadsheet to CRM in a day", blurb: "Import, organize, and automate your pipeline.", tag: "On-demand", meta: "29 min" },
      { title: "Office hours: ask us anything", blurb: "Bring your questions — our team answers live.", tag: "Live", meta: "Fridays" },
    ],
  }} />;
}
