"use server";

import { listPopups, savePopup, deletePopup, type Popup, type PopupContent } from "@/lib/popups";

export async function listPopupsAction(tenantId: string): Promise<Popup[]> {
  return listPopups(tenantId);
}

export async function savePopupAction(tenantId: string, name: string, content: PopupContent, id?: string): Promise<{ ok: boolean; error?: string; popups: Popup[] }> {
  const res = await savePopup({ tenantId, id, name, content });
  return { ok: res.ok, error: res.error, popups: await listPopups(tenantId) };
}

export async function deletePopupAction(tenantId: string, id: string): Promise<{ popups: Popup[] }> {
  await deletePopup(tenantId, id);
  return { popups: await listPopups(tenantId) };
}
