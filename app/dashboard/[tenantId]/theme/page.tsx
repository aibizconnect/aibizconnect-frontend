"use client";

import { use } from "react";
import ThemeEditor from "@/components/theme/ThemeEditor";

export default function ThemePage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <ThemeEditor tenantId={tenantId} />;
}
