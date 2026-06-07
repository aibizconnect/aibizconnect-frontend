export async function loadTenantTheme(tenantId: string): Promise<void> {
  try {
    const res = await fetch(`/agent/tenants/${tenantId}/theme`, {
      cache: "no-store"
    });

    if (!res.ok) return;
    const theme = await res.json();
    if (!theme) return;

    const root = document.documentElement;

    if (theme.primary) root.style.setProperty("--primary", theme.primary);
    if (theme.secondary) root.style.setProperty("--secondary", theme.secondary);
    if (theme.sidebar_color) root.style.setProperty("--sidebar", theme.sidebar_color);
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
  } catch {
    // Non-critical — silently skip if theme endpoint is unavailable
  }
}
