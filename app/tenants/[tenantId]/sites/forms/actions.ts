"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import {
  listForms, getForm, createForm, updateForm, deleteForm, listSubmissions,
  type FormDef, type FormField, type FormSettings, type Submission,
} from "@/lib/server/forms";

export async function listFormsAction(tenantId: string): Promise<FormDef[]> {
  await requireTenantAccess(tenantId);
  try { return await listForms(tenantId); } catch { return []; }
}
export async function getFormAction(tenantId: string, id: string): Promise<FormDef | null> {
  await requireTenantAccess(tenantId); return getForm(tenantId, id);
}
export async function newFormAction(tenantId: string): Promise<{ id?: string; forms: FormDef[]; error?: string }> {
  await requireTenantAccess(tenantId);
  const r = await createForm(tenantId, { name: "Untitled form" });
  return { id: r.id, error: r.error, forms: await listForms(tenantId) };
}
export async function saveFormAction(tenantId: string, id: string, patch: { name?: string; fields?: FormField[]; settings?: FormSettings; status?: string }): Promise<FormDef[]> {
  await requireTenantAccess(tenantId); await updateForm(tenantId, id, patch); return listForms(tenantId);
}
export async function deleteFormAction(tenantId: string, id: string): Promise<FormDef[]> {
  await requireTenantAccess(tenantId); await deleteForm(tenantId, id); return listForms(tenantId);
}
export async function submissionsAction(tenantId: string, formId: string): Promise<Submission[]> {
  await requireTenantAccess(tenantId); return listSubmissions(tenantId, formId);
}
