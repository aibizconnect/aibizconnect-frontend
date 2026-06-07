"use client";

import { use } from "react";
import AgentPersonaEditor from "@/components/agent/AgentPersonaEditor";

export default function PersonaPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <AgentPersonaEditor tenantId={tenantId} />;
}
