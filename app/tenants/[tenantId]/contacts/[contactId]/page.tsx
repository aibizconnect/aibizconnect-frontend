import ContactDetail from "@/components/crm/ContactDetail";

export default async function ContactDetailPage({
  params
}: {
  params: Promise<{ tenantId: string; contactId: string }>;
}) {
  const { tenantId, contactId } = await params;
  return (
    <ContactDetail
      tenantId={tenantId}
      contactId={contactId}
    />
  );
}
