import type { Metadata } from "next";
import ReviewForm from "@/components/reputation/ReviewForm";

export const metadata: Metadata = { title: "Leave a review" };

export default async function ReviewPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const vars = { "--abc-color-accent": "#22d3ee" } as React.CSSProperties;
  return (
    <div style={vars} className="min-h-screen bg-[#0a1224] text-[#e8eefc]">
      <div className="mx-auto max-w-lg px-6 py-16">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-6 w-auto" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>How did we do?</h1>
        <p className="mb-8 mt-2 text-slate-400">Your feedback helps us improve — and helps others find us.</p>
        <ReviewForm tenantId={tenantId} />
      </div>
    </div>
  );
}
