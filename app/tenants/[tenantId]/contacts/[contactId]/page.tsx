import ContactDetailV2 from "@/components/crm/ContactDetailV2";

// GHL-parity contact detail (rebuilt — the old scaffold fetched JSON from HTML routes).
export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string; contactId: string }>;
}) {
  const { tenantId, contactId } = await params;
  return <ContactDetailV2 tenantId={tenantId} contactId={contactId} />;
}
