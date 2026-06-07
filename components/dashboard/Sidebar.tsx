"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", path: "" },
  { label: "Settings", path: "/settings" },
  { label: "Workflows", path: "/workflows" },
  { label: "Workflow Status", path: "/workflows/status" },
  { label: "Workflow Builder", path: "/workflows/builder" },
  { label: "AI Workflow Generator", path: "/workflows/ai" },
  { label: "Triggers", path: "/triggers" },
  { label: "Manage Triggers", path: "/triggers/manage" },
  { label: "Analytics", path: "/analytics" },
  { label: "Logs", path: "/logs" },
  { label: "Audit Logs", path: "/audit" },
  { label: "Billing", path: "/billing" },
  { label: "Billing Portal", path: "/billing/portal" },
  { label: "Users", path: "/users" },
  { label: "Manage Users", path: "/users/manage" },
  { label: "Theme", path: "/theme" },
  { label: "Agent Console", path: "/agent" },
  { label: "Agent Memory", path: "/agent/memory" },
  { label: "Tool Logs", path: "/agent/tools" },
  { label: "Agent Persona", path: "/agent/persona" },
  { label: "Builder Agent", path: "/builder" }
];

export default function Sidebar({ tenantId }: { tenantId: string }) {
  const base = `/dashboard/${tenantId}`;
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 p-6 flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-900">Tenant Dashboard</h2>
      <nav className="flex flex-col gap-1">
        {navItems.map(({ label, path }) => {
          const href = `${base}${path}`;
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
