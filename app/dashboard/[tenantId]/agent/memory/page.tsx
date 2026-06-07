"use client";

import { use } from "react";
import AgentMemoryViewer from "@/components/agent/AgentMemoryViewer";

export default function AgentMemoryPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <AgentMemoryViewer tenantId={tenantId} />;
}
