"use client";

import { use } from "react";
import TriggerManager from "@/components/triggers/TriggerManager";

export default function TriggerManagePage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <TriggerManager tenantId={tenantId} />;
}
