"use client";

import { use } from "react";
import AgentChat from "@/components/agent/AgentChat";

export default function AgentPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <AgentChat tenantId={tenantId} />;
}
