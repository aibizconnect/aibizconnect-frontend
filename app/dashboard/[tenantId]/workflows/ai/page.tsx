"use client";

import { use } from "react";
import AIWorkflowGenerator from "@/components/workflows/AIWorkflowGenerator";

export default function AIWorkflowPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <AIWorkflowGenerator tenantId={tenantId} />;
}
