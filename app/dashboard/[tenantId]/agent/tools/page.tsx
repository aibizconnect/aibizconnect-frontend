"use client";

import { use } from "react";
import AgentToolLogViewer from "@/components/agent/AgentToolLogViewer";

export default function AgentToolsPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <AgentToolLogViewer tenantId={tenantId} />;
}
