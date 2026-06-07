"use client";

import Link from "next/link";

/** "+ New website" — opens the onboarding wizard (draft-only creation). */
export default function AddWebsiteButton({ tenantId }: { tenantId: string }) {
  return (
    <Link href={`/tenants/${tenantId}/sites/new`}
      className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90">
      ＋ New website
    </Link>
  );
}
