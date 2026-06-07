"use client";

import { use, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import { loadTenantTheme } from "@/lib/theme";

export default function TenantDashboardLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);

  useEffect(() => {
    loadTenantTheme(tenantId);
  }, [tenantId]);

  return (
    <div className="flex h-screen w-full">
      <Sidebar tenantId={tenantId} />
      <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
