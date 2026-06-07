"use server";

import { listContacts, createContact, deleteContact, type Contact } from "@/lib/crm";

export async function listContactsAction(tenantId: string): Promise<Contact[]> { return listContacts(tenantId); }

export async function createContactAction(tenantId: string, c: { name?: string; email?: string; phone?: string }): Promise<{ ok: boolean; error?: string; contacts: Contact[] }> {
  const r = await createContact(tenantId, c);
  return { ...r, contacts: await listContacts(tenantId) };
}

export async function deleteContactAction(tenantId: string, id: string): Promise<{ contacts: Contact[] }> {
  await deleteContact(tenantId, id);
  return { contacts: await listContacts(tenantId) };
}
