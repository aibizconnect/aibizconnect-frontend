import type { Metadata } from "next";
import ResourceListPage from "@/components/marketing/abc/ResourceListPage";

export const metadata: Metadata = { title: "Blog — AIBizConnect OS", description: "Tactics, product news, and small-business playbooks from the AIBizConnect team." };

export default function BlogPage() {
  return <ResourceListPage d={{
    eyebrow: "Blog", title: "Ideas to grow your business", sub: "Tactics, product news, and playbooks for solo pros and small teams.",
    items: [
      { title: "How AI books appointments while you sleep", blurb: "A look at how the concierge qualifies and books leads 24/7.", tag: "Automation", meta: "6 min read" },
      { title: "Replace 5 tools with one OS — a migration guide", blurb: "Move your site, CRM, and email into AIBizConnect without losing data.", tag: "Playbook", meta: "9 min read" },
      { title: "The follow-up sequences every business should run", blurb: "Five nurture flows that recover lost leads on autopilot.", tag: "Marketing", meta: "7 min read" },
      { title: "From sign-up to live in a day: a real timeline", blurb: "What the first 24 hours on AIBizConnect actually looks like.", tag: "Getting started", meta: "5 min read" },
      { title: "White-label sub-accounts for agencies, explained", blurb: "Run many client brands from one login — and bill per seat.", tag: "Agencies", meta: "8 min read" },
      { title: "Lead scoring: who to call next, decided for you", blurb: "How AI ranks every lead by intent so you never guess.", tag: "CRM", meta: "6 min read" },
    ],
  }} />;
}
