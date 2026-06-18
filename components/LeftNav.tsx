"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { startImpersonation } from "@/app/tenants/[tenantId]/website/actions";

/**
 * polished tenant sidebar (Ali's direction: "I want the tenant dashboard to look like
 * the market-leading platform"). Dark navy rail, brand wordmark, tenant chip, search, and two grouped
 * nav clusters mirroring the leading builder. Items that map to a built route link through; not-yet-built
 * items render as dimmed "soon" rows (honest — never 404s).
 */

type Item = { label: string; key: string; route?: string; soon?: boolean };

const ICONS: Record<string, ReactNode> = {
  ask: <path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9 8.96 8.96 0 0 1-4-.94L3 21l1.06-4.94A8.96 8.96 0 0 1 3 12a9 9 0 0 1 9-9Z" />,
  launchpad: <path d="M4 13a8 8 0 0 1 8-8 8 8 0 0 1 8 8M12 5v8m0 0-3 3m3-3 3 3" />,
  dashboard: <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z" />,
  conversations: <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />,
  calendars: <path d="M3 4h18v18H3zM3 9h18M8 2v4M16 2v4" />,
  contacts: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />,
  opportunities: <path d="M3 3v18h18M7 14l3-3 3 3 5-5" />,
  payments: <path d="M2 5h20v14H2zM2 10h20" />,
  agents: <path d="M12 2v3M7 8h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM9 13h.01M15 13h.01M3 13h2M19 13h2" />,
  marketing: <path d="M3 11 22 2l-9 19-2-8-8-2Z" />,
  automation: <path d="M12 2a3 3 0 0 1 3 3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M4.2 6.2l1.4 1.4M2 12h3M19 12h3M18.4 6.2 17 7.6" />,
  sites: <path d="M3 3h18v18H3zM3 9h18M9 21V9" />,
  strategy: <path d="M4 19V5m0 14h16M8 16V9m4 7V6m4 10v-4" />,
  memberships: <path d="M12 2 9 9l-7 .5 5.5 4.5L6 21l6-3.5L18 21l-1.5-7L22 9.5 15 9 12 2Z" />,
  media: <path d="M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6" />,
  reputation: <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.4h7.6L12 2Z" />,
  reporting: <path d="M3 3v18h18M8 16v-5M13 16V8M18 16v-9" />,
  market: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  education: <path d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5M22 10v6" />,
  community: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />,
  tools: <path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5l-2.3 2.3-2-2 2.3-2.3Z" />,
  settings: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.81 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 14H4.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 11 4.6V4.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.81 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11H21a2 2 0 0 1 0 4h-.09Z" />,
};

const GROUP_1: Item[] = [
  { label: "Ask AI", key: "ask", soon: true },
  { label: "Launchpad", key: "launchpad", route: "launchpad" },
  { label: "Dashboard", key: "dashboard", route: "dashboard" },
  { label: "Conversations", key: "conversations", route: "conversations" },
  { label: "Calendars", key: "calendars", route: "calendars" },
  { label: "Contacts", key: "contacts", route: "contacts" },
  { label: "Opportunities", key: "opportunities", route: "pipelines" },
  { label: "Payments", key: "payments", route: "payments" },
];

const GROUP_2: Item[] = [
  { label: "AI Agents", key: "agents", route: "agents" },
  { label: "Marketing", key: "marketing", route: "marketing" },
  { label: "Automation", key: "automation", route: "automations" },
  { label: "Sites", key: "sites", route: "sites" },
  { label: "Strategy", key: "strategy", route: "strategy" },
  { label: "Tools", key: "tools", route: "tools" },
  { label: "Education", key: "education", route: "memberships" },
  { label: "Community", key: "community", soon: true },
  { label: "Media Storage", key: "media", route: "media" },
  { label: "Reputation", key: "reputation", route: "reputation" },
  { label: "Reporting", key: "reporting", route: "reporting" },
  { label: "App Marketplace", key: "market", soon: true },
];

function Icon({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      {ICONS[k]}
    </svg>
  );
}

type SignedInUser = { name: string; email: string } | null;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LeftNav({ tenantId, user = null, canImpersonate = false, actingAs = null, isPlatformAdmin = false }: { tenantId: string; user?: SignedInUser; canImpersonate?: boolean; actingAs?: string | null; isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [actOpen, setActOpen] = useState(false);
  const [actEmail, setActEmail] = useState("");
  const [actBusy, setActBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  // Collapsed (icons-only) state, persisted; drives a --nav-w CSS var so the page content
  // (main margin-left: var(--nav-w)) follows the rail width.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { setCollapsed(localStorage.getItem("nav-collapsed") === "1"); }, []);
  useEffect(() => {
    document.documentElement.style.setProperty("--nav-w", collapsed ? "72px" : "248px");
    try { localStorage.setItem("nav-collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  async function beginActAs(e: React.FormEvent) {
    e.preventDefault();
    setActBusy(true); setActErr(null);
    try {
      const r = await startImpersonation(actEmail);
      if (!r.ok) { setActErr(r.message ?? "Could not start."); return; }
      setActOpen(false); setActEmail(""); router.refresh();
    } finally { setActBusy(false); }
  }

  const Row = ({ item }: { item: Item }) => {
    const href = item.route ? `/tenants/${tenantId}/${item.route}` : "#";
    const active = !!item.route && pathname.startsWith(href);
    const base = `group flex items-center gap-3 rounded-lg py-2 text-sm transition ${collapsed ? "justify-center px-2" : "px-3"}`;
    if (item.soon) {
      return (
        <div className={`${base} cursor-default text-[var(--gray-400)]`} title={collapsed ? `${item.label} — coming soon` : "Coming soon"}>
          <Icon k={item.key} />
          {!collapsed && <><span className="flex-1">{item.label}</span><span className="rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--gray-500)]">soon</span></>}
        </div>
      );
    }
    return (
      <Link href={href} title={collapsed ? item.label : undefined} className={`${base} ${active ? "bg-[var(--blue-50)] font-semibold text-[var(--color-primary)]" : "text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:text-[var(--navy-900)]"}`}>
        <Icon k={item.key} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };
  const pad = collapsed ? "px-2" : "px-3";

  return (
    <aside className={`abc-ds fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-body)] transition-[width] duration-200 ${collapsed ? "w-[72px]" : "w-[248px]"}`}>
      {/* Brand + collapse toggle */}
      <div className={`flex items-center border-b border-[var(--border-subtle)] py-4 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
        {!collapsed && (
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/abc/app-icon.png" alt="AIBizConnect" className="h-7 w-7" />
            <span style={{ fontFamily: "var(--font-display)" }} className="text-[18px] font-semibold text-[var(--navy-900)]">AIBiz<span className="text-[var(--color-primary)]">Connect</span></span>
          </span>
        )}
        <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand menu" : "Collapse menu"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--gray-500)] transition hover:bg-[var(--gray-100)] hover:text-[var(--navy-900)]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 transition-transform ${collapsed ? "rotate-180" : ""}`}><path d="M15 18l-6-6 6-6" /></svg>
        </button>
      </div>

      {/* Tenant chip */}
      <div className={`${pad} pt-3`}>
        <button title="AIBizConnect" className={`flex w-full items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-page)] hover:bg-[var(--gray-100)] ${collapsed ? "justify-center p-2" : "px-3 py-2 text-left"}`}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--gradient-brand)" }}>AB</span>
          {!collapsed && <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text-strong)]">AIBizConnect</span>
              <span className="block truncate text-[11px] text-[var(--text-muted)]">{user ? `Signed in: ${user.name}` : "Richmond Hill, Ontario"}</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-[var(--text-muted)]"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
          </>}
        </button>
      </div>

      {/* Search */}
      <div className={`${pad} pt-3`}>
        <div title="Search" className={`flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-page)] text-[var(--text-muted)] ${collapsed ? "justify-center p-2" : "px-3 py-2 text-sm"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          {!collapsed && <><span className="flex-1">Search</span><span className="rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-[10px] text-[var(--gray-500)]">ctrlK</span></>}
        </div>
      </div>

      {/* Nav */}
      <nav className={`mt-3 flex-1 space-y-0.5 overflow-y-auto pb-4 ${pad}`}>
        {GROUP_1.map((i) => <Row key={i.key} item={i} />)}
        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {GROUP_2.map((i) => <Row key={i.key} item={i} />)}
        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {canImpersonate && <Row item={{ label: "Team", key: "contacts", route: "team" }} />}
        {isPlatformAdmin && (
          <Link href="/platform" title="Platform admin panel" className={`group flex items-center gap-3 rounded-lg py-2 text-sm text-[var(--gray-600)] transition hover:bg-[var(--gray-50)] hover:text-[var(--navy-900)] ${collapsed ? "justify-center px-2" : "px-3"}`}>
            <Icon k="settings" />
            {!collapsed && <><span className="flex-1">Platform</span><span className="rounded bg-[var(--blue-100)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--blue-600)]">admin</span></>}
          </Link>
        )}
        <Row item={{ label: "Settings", key: "settings", route: "settings" }} />
      </nav>

      {/* Superadmin: act as another team member (hidden when collapsed) */}
      {canImpersonate && !actingAs && !collapsed && (
        <div className="border-t border-[var(--border-subtle)] px-3 py-2">
          {actOpen ? (
            <form onSubmit={beginActAs} className="space-y-1.5">
              <input
                autoFocus value={actEmail} onChange={(e) => setActEmail(e.target.value)}
                placeholder="admin@aibizconnect.app" type="email"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-page)] px-2 py-1.5 text-xs text-[var(--text-strong)] placeholder:text-[var(--text-muted)]" />
              {actErr && <p className="text-[11px] text-[var(--danger)]">{actErr}</p>}
              <div className="flex gap-1.5">
                <button type="submit" disabled={actBusy} className="flex-1 rounded-md bg-[var(--warning)] px-2 py-1 text-xs font-medium text-white hover:brightness-95 disabled:opacity-50">{actBusy ? "…" : "Act as"}</button>
                <button type="button" onClick={() => { setActOpen(false); setActErr(null); }} className="rounded-md px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--navy-900)]">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setActOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--gray-600)] transition hover:bg-[var(--gray-50)] hover:text-[var(--navy-900)]" title="Superadmin: act as an admin/staff member">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" /></svg>
              Act as user
            </button>
          )}
        </div>
      )}

      {/* Signed-in user (or a sign-in prompt when no session) */}
      <div className={`border-t border-[var(--border-subtle)] py-3 ${pad}`}>
        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link href={`/tenants/${tenantId}/account`} title={`${user.name} — account`} className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--gradient-brand)" }}>{initials(user.name)}</Link>
              <form action="/auth/signout" method="post">
                <button type="submit" title="Sign out" className="rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--gray-100)] hover:text-[var(--navy-900)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href={`/tenants/${tenantId}/account`} title="Account & password" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: "var(--gradient-brand)" }}>{initials(user.name)}</Link>
              <Link href={`/tenants/${tenantId}/account`} title="Account & password" className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--text-strong)] hover:underline">{user.name}</span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">{user.email}</span>
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" title="Sign out" className="rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--gray-100)] hover:text-[var(--navy-900)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                </button>
              </form>
            </div>
          )
        ) : (
          <Link href="/login" title="Sign in" className={`flex items-center justify-center gap-2 rounded-lg bg-[var(--blue-50)] py-2 text-sm font-medium text-[var(--color-primary)] transition hover:bg-[var(--blue-100)] ${collapsed ? "px-2" : "px-3"}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
            {!collapsed && "Sign in"}
          </Link>
        )}
      </div>
    </aside>
  );
}
