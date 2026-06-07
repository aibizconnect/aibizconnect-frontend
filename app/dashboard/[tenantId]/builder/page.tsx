"use client";

import { use } from "react";
import BuilderConsole from "@/components/builder/BuilderConsole";

export default function BuilderPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <BuilderConsole tenantId={tenantId} />;
}
