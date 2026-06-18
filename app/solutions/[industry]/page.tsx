import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IndustryPage from "@/components/marketing/abc/IndustryPage";
import { INDUSTRIES, INDUSTRY_SLUGS } from "@/lib/marketing/industries";

/** Per-industry solution pages (Real Estate is the Claude Design exemplar; rest share its shape). */
export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((industry) => ({ industry }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry } = await params;
  const d = INDUSTRIES[industry];
  if (!d) return { title: "Solutions — AIBizConnect OS" };
  return { title: `${d.eyebrow.replace(/^For /, "")} — AIBizConnect OS`, description: d.sub };
}

export default async function SolutionIndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const d = INDUSTRIES[industry];
  if (!d) notFound();
  return <IndustryPage d={d} />;
}
