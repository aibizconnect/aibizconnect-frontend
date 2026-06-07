"use client";

import { use } from "react";
import WorkflowBuilder from "@/components/workflows/WorkflowBuilder";

export default function WorkflowBuilderPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <WorkflowBuilder tenantId={tenantId} />;
}
