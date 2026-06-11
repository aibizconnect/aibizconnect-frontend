import ContactsShell from "@/components/crm/ContactsShell";

// GHL-parity contacts area (Blueprint v3.2): Smart Lists | Tasks | Companies.
export default async function ContactsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  return <ContactsShell tenantId={tenantId} />;
}
