import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getAuthHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getTenantContext(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load tenant: ${res.status}`);
  return res.json();
}

export async function getTenantWorkflows(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/workflows`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load workflows: ${res.status}`);
  return res.json();
}

export async function getTenantTriggers(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/triggers`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load triggers: ${res.status}`);
  return res.json();
}

export async function getTenantUsers(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/users`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load users: ${res.status}`);
  return res.json();
}

export async function getWorkflowRuns(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/workflow-runs`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load workflow runs: ${res.status}`);
  return res.json();
}

export async function getTenantAnalytics(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/analytics`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load analytics: ${res.status}`);
  return res.json();
}

export async function getTenantAuditLogs(tenantId: string) {
  const res = await fetch(`${API_URL}/tenants/${tenantId}/audit`, {
    headers: await getAuthHeader(),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Failed to load audit logs: ${res.status}`);
  return res.json();
}
