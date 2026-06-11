"use server";

import {
  listContacts, createContact, deleteContact,
  listContactsPage, getContact, updateContact, bulkTagContacts, bulkDeleteContacts, importContacts,
  restoreContacts, purgeContacts, bulkUpdateContactField, mergeContacts, listCompanies, listCrmAuditLog,
  listTags, listCustomFields, listContactNotes, addContactNote, deleteContactNote,
  listContactTasks, addContactTask, setContactTaskStatus, deleteContactTask,
  listSmartLists, createSmartList, deleteSmartList,
  listAppointmentsByEmail, listOpportunitiesForContact,
  type Contact, type ContactFull, type ContactFilters, type ContactPatch,
  type ContactNote, type ContactTask, type SmartList, type CustomFieldDef, type Opportunity,
} from "@/lib/crm";

async function requireTenant(tenantId: string): Promise<void> {
  const { requireTenantAccess } = await import("@/lib/auth/tenant-access");
  await requireTenantAccess(tenantId);
}
async function audit(tenantId: string, action: string, meta: Record<string, unknown>): Promise<void> {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    await logPlatformEvent({ action, meta: { tenantId, ...meta } });
  } catch { /* best-effort */ }
}

export async function listContactsAction(tenantId: string): Promise<Contact[]> { return listContacts(tenantId); }

export async function createContactAction(tenantId: string, c: { name?: string; email?: string; phone?: string; company?: string; tags?: string[] }): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  return createContact(tenantId, c);
}

export async function deleteContactAction(tenantId: string, id: string): Promise<{ ok: boolean }> {
  await requireTenant(tenantId);
  await deleteContact(tenantId, id);
  return { ok: true };
}

// ── GHL-parity (D-229) ───────────────────────────────────────────────────────
export async function listContactsPageAction(tenantId: string, filters: ContactFilters): Promise<{ rows: ContactFull[]; total: number }> {
  await requireTenant(tenantId);
  return listContactsPage(tenantId, filters);
}
export async function getContactAction(tenantId: string, id: string): Promise<ContactFull | null> {
  await requireTenant(tenantId);
  return getContact(tenantId, id);
}
export async function updateContactAction(tenantId: string, id: string, patch: ContactPatch): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  return updateContact(tenantId, id, patch);
}
export async function bulkTagAction(tenantId: string, ids: string[], tag: string, mode: "add" | "remove"): Promise<{ ok: boolean; error?: string; changed: number }> {
  await requireTenant(tenantId);
  return bulkTagContacts(tenantId, ids, tag, mode);
}
export async function bulkDeleteAction(tenantId: string, ids: string[]): Promise<{ ok: boolean; error?: string; deleted: number }> {
  await requireTenant(tenantId);
  const r = await bulkDeleteContacts(tenantId, ids);
  if (r.ok && r.deleted) await audit(tenantId, "crm.contacts.bulk_delete", { count: r.deleted });
  return r;
}
export async function importContactsAction(tenantId: string, rows: { name?: string; email?: string; phone?: string; company?: string; tags?: string[]; source?: string }[]): Promise<{ ok: boolean; error?: string; inserted: number; skipped: number }> {
  await requireTenant(tenantId);
  const r = await importContacts(tenantId, rows);
  if (r.ok) await audit(tenantId, "crm.contacts.import", { inserted: r.inserted, skipped: r.skipped });
  return r;
}
export async function listTagsAction(tenantId: string) { await requireTenant(tenantId); return listTags(tenantId); }
export async function listCustomFieldsAction(tenantId: string): Promise<CustomFieldDef[]> { await requireTenant(tenantId); return listCustomFields(tenantId, "contact"); }

// notes
export async function listNotesAction(tenantId: string, contactId: string): Promise<ContactNote[]> { await requireTenant(tenantId); return listContactNotes(tenantId, contactId); }
export async function addNoteAction(tenantId: string, contactId: string, body: string): Promise<{ ok: boolean; error?: string }> { await requireTenant(tenantId); return addContactNote(tenantId, contactId, body); }
export async function deleteNoteAction(tenantId: string, id: string): Promise<{ ok: boolean }> { await requireTenant(tenantId); await deleteContactNote(tenantId, id); return { ok: true }; }

// tasks
export async function listTasksAction(tenantId: string, opts: { contactId?: string; status?: "open" | "done" } = {}): Promise<ContactTask[]> { await requireTenant(tenantId); return listContactTasks(tenantId, opts); }
export async function addTaskAction(tenantId: string, input: { contactId?: string; title: string; dueAt?: string; assigneeEmail?: string }): Promise<{ ok: boolean; error?: string }> { await requireTenant(tenantId); return addContactTask(tenantId, input); }
export async function setTaskStatusAction(tenantId: string, id: string, status: "open" | "done"): Promise<{ ok: boolean; error?: string }> { await requireTenant(tenantId); return setContactTaskStatus(tenantId, id, status); }
export async function deleteTaskAction(tenantId: string, id: string): Promise<{ ok: boolean }> { await requireTenant(tenantId); await deleteContactTask(tenantId, id); return { ok: true }; }

// smart lists
export async function listSmartListsAction(tenantId: string): Promise<SmartList[]> { await requireTenant(tenantId); return listSmartLists(tenantId); }
export async function createSmartListAction(tenantId: string, name: string, filters: ContactFilters): Promise<{ ok: boolean; error?: string }> { await requireTenant(tenantId); return createSmartList(tenantId, name, filters); }
export async function deleteSmartListAction(tenantId: string, id: string): Promise<{ ok: boolean }> { await requireTenant(tenantId); await deleteSmartList(tenantId, id); return { ok: true }; }

// detail-page extras
export async function contactAppointmentsAction(tenantId: string, email: string) { await requireTenant(tenantId); return listAppointmentsByEmail(tenantId, email); }
export async function contactOpportunitiesAction(tenantId: string, contactId: string): Promise<Opportunity[]> { await requireTenant(tenantId); return listOpportunitiesForContact(tenantId, contactId); }

// ── GHL parity sweep (D-232..D-236) ─────────────────────────────────────────
export async function mergeContactsAction(tenantId: string, primaryId: string, otherIds: string[]): Promise<{ ok: boolean; error?: string }> {
  await requireTenant(tenantId);
  const r = await mergeContacts(tenantId, primaryId, otherIds);
  if (r.ok) await audit(tenantId, "crm.contacts.merge", { primaryId, merged: otherIds.length });
  return r;
}
export async function bulkUpdateFieldAction(tenantId: string, ids: string[], field: "owner_email" | "source", value: string): Promise<{ ok: boolean; error?: string; changed: number }> {
  await requireTenant(tenantId);
  const r = await bulkUpdateContactField(tenantId, ids, field, value);
  if (r.ok && r.changed) await audit(tenantId, "crm.contacts.bulk_update", { field, count: r.changed });
  return r;
}
export async function restoreContactsAction(tenantId: string, ids: string[]): Promise<{ ok: boolean; error?: string; restored: number }> {
  await requireTenant(tenantId);
  const r = await restoreContacts(tenantId, ids);
  if (r.ok && r.restored) await audit(tenantId, "crm.contacts.restore", { count: r.restored });
  return r;
}
export async function purgeContactsAction(tenantId: string, ids: string[]): Promise<{ ok: boolean; error?: string; purged: number }> {
  await requireTenant(tenantId);
  const r = await purgeContacts(tenantId, ids);
  if (r.ok && r.purged) await audit(tenantId, "crm.contacts.purge", { count: r.purged });
  return r;
}
export async function listCompaniesAction(tenantId: string) { await requireTenant(tenantId); return listCompanies(tenantId); }
export async function listCrmAuditAction(tenantId: string) { await requireTenant(tenantId); return listCrmAuditLog(tenantId); }
