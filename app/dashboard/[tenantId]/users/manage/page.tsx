"use client";

import { use } from "react";
import UserManager from "@/components/users/UserManager";

export default function UserManagePage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  return <UserManager tenantId={tenantId} />;
}
