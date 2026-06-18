import type { Metadata } from "next";
import FeaturePage from "@/components/marketing/abc/FeaturePage";
import { FEATURES } from "@/lib/marketing/features";

const d = FEATURES.marketplace;
export const metadata: Metadata = { title: `${d.eyebrow} — AIBizConnect OS`, description: d.sub };
export default function Page() { return <FeaturePage d={d} />; }
