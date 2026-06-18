import { NextRequest, NextResponse } from "next/server";

/**
 * Route protection (auth foundation, slice 3).
 *
 * Public site routes (/sites/**) stay open. Tenant editor/dashboard routes are
 * protected: without a session `token` cookie the user is redirected to /login.
 *
 * GATED BY ENV so it does not lock the editor out before real logins exist:
 *   AUTH_ENFORCE=true  -> enforce (production / after signup)
 *   unset/false        -> dev pass-through (current state)
 *
 * Once Supabase Auth is live and admin@aibizconnect.app has signed up, set
 * AUTH_ENFORCE=true.
 */
const PROTECTED = [/^\/tenants\//, /^\/dashboard\//];

// Hosts that are the PLATFORM itself (app/editor), NOT a tenant public site.
const PLATFORM_HOSTS = new Set([
  "localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:3000",
  "aibizconnect.app", "www.aibizconnect.app", "aibizconnect.ca", "www.aibizconnect.ca",
  // The application host itself is NOT a tenant site. Pin it so a wildcard
  // *.aibizconnect.app never tenant-routes the main app (and skip a per-request
  // tenant_domains lookup on every app request). "app" is also RESERVED in lib/domains.
  "app.aibizconnect.app", "app.aibizconnect.ca",
]);
const ROOT_DOMAIN = "aibizconnect.app";

/** Extract a tenant subdomain from a host, or null if this is a platform host. */
function tenantSubdomain(host: string): string | null {
  const h = host.split(":")[0].toLowerCase();
  if (PLATFORM_HOSTS.has(host) || PLATFORM_HOSTS.has(h)) return null;
  if (h.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = h.slice(0, -1 * (ROOT_DOMAIN.length + 1));
    if (!sub || sub === "www") return null;
    return sub;
  }
  return null; // apex/other -> handled as a potential custom domain
}

/** Resolve a host to a tenantId via tenant_domains (anon read; interim-open RLS). */
async function resolveTenant(host: string, sub: string | null): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) return null;
  const h = host.split(":")[0].toLowerCase();
  const filter = sub ? `subdomain.eq.${sub}` : `custom_domain.eq.${h}`;
  try {
    const res = await fetch(`${base}/rest/v1/tenant_domains?or=(${filter})&select=tenant_id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows[0]?.tenant_id ? rows[0].tenant_id : null;
  } catch {
    return null;
  }
}

const WWW_REDIRECT = new Set(["www.aibizconnect.app", "www.aibizconnect.ca"]);

export async function middleware(req: NextRequest) {
  // Canonicalize www -> apex for our own domains (308 preserves method). The apex is the
  // canonical marketing home; www just forwards. Runs before any tenant/auth logic.
  const rawHost = (req.headers.get("host") ?? "").toLowerCase();
  if (WWW_REDIRECT.has(rawHost)) {
    const url = req.nextUrl.clone();
    url.hostname = rawHost.slice(4); // drop "www."
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Forward Supabase auth codes that land on the site root (email confirm / magic
  // link / reset) to the callback route that exchanges them for a session.
  if (req.nextUrl.pathname === "/" && req.nextUrl.searchParams.has("code")) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Host-based tenant routing (subdomain-first; custom domains supported). A request
  // to {tenant}.aibizconnect.app (or an active custom domain) is rewritten to the
  // tenant's public site. Platform hosts and already-/sites/ or /api/ paths pass
  // through. Zero live impact today: DNS is not pointed yet. Precedence: explicit
  // /sites path > host resolution > fallback.
  const host = req.headers.get("host") ?? "";
  const path = req.nextUrl.pathname;
  const isInfraPath = path.startsWith("/_next") || path.startsWith("/api") || path.startsWith("/sites") || path.startsWith("/auth") || path.startsWith("/login") || path.includes(".");
  if (!isInfraPath) {
    const sub = tenantSubdomain(host);
    const isPlatform = PLATFORM_HOSTS.has(host) || PLATFORM_HOSTS.has(host.split(":")[0].toLowerCase());
    if (!isPlatform) {
      const tenantId = await resolveTenant(host, sub);
      if (tenantId) {
        const slug = path === "/" ? "home" : path.replace(/^\/+/, "");
        const url = req.nextUrl.clone();
        url.pathname = `/sites/${tenantId}/${slug}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  if (process.env.AUTH_ENFORCE !== "true") return NextResponse.next();

  const isProtected = PROTECTED.some((re) => re.test(path));
  if (!isProtected) return NextResponse.next();

  const hasSession = !!req.cookies.get("token")?.value;
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", path);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals, API, and static assets so host-based
  // tenant routing can intercept public requests; auth/protection logic still only
  // acts on its own paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
