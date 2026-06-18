import type { Metadata } from "next";
import ResourceListPage from "@/components/marketing/abc/ResourceListPage";

export const metadata: Metadata = { title: "Guides — AIBizConnect OS", description: "Step-by-step guides to set up your site, CRM, funnels, and automations on AIBizConnect OS." };

export default function GuidesPage() {
  return <ResourceListPage d={{
    eyebrow: "Guides", title: "Set up like a pro", sub: "Step-by-step guides to launch and automate your business on AIBizConnect OS.",
    items: [
      { title: "Build your first AI website", blurb: "From industry pick to published site in one sitting.", tag: "Websites", meta: "Guide" },
      { title: "Import and organize your contacts", blurb: "Get your CRM set up and your pipeline moving in minutes.", tag: "CRM", meta: "Guide" },
      { title: "Launch a lead-capture funnel", blurb: "Wire a form to your CRM and trigger the right follow-up.", tag: "Funnels", meta: "Guide" },
      { title: "Set up your AI concierge", blurb: "Teach the assistant your voice, your offers, and your calendar.", tag: "AI", meta: "Guide" },
      { title: "Build an email + SMS nurture", blurb: "Triggers, waits, and branches that run on autopilot.", tag: "Automations", meta: "Guide" },
      { title: "Connect a custom domain", blurb: "Point your domain and go live with SSL in minutes.", tag: "Domains", meta: "Guide" },
    ],
  }} />;
}
