"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/workflows", label: "Workflows", icon: "⚡" },
  { href: "/tasks", label: "Task Queue", icon: "📋" },
  { href: "/security", label: "Security", icon: "🛡️" },
  { href: "/logs", label: "Logs", icon: "📄" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <span className="font-bold text-zinc-900 dark:text-zinc-100">AI Agent</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {nav.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
