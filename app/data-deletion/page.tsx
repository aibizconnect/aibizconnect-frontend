import LegalShell, { H2 } from "@/components/legal/LegalShell";

export const metadata = { title: "Data Deletion · AIBizConnect", description: "How to request deletion of your data from AIBizConnect." };

export default function DataDeletionPage() {
  return (
    <LegalShell title="Data Deletion Instructions" updated="June 13, 2026">
      <p>You can request deletion of your personal data from AIBizConnect at any time. This page explains how, including for data obtained when you connect a Facebook or Instagram account.</p>

      <H2>How to request deletion</H2>
      <p>Email <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app?subject=Data%20deletion%20request">admin@aibizconnect.app</a> from the address associated with your account, with the subject &ldquo;Data deletion request,&rdquo; and tell us what you would like deleted (your whole account, or a specific connected account / dataset). We will verify the request and complete it within 30 days, then confirm by email.</p>

      <H2>Delete instantly yourself</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Disconnect a channel:</strong> go to <strong>Settings → Integrations</strong> and click <strong>Disconnect</strong> on any connected account (Facebook, Instagram, WhatsApp, Google, Twilio, etc.). This immediately removes the stored access tokens for that account.</li>
        <li><strong>Delete content:</strong> contacts, conversations, websites, and other records can be deleted directly from their pages in the app.</li>
      </ul>

      <H2>Facebook &amp; Instagram data</H2>
      <p>When you connect a Facebook Page or Instagram business account, we store an access token plus the messages, leads, and page details needed to power your inbox and tools. If you remove our app from your Facebook settings, or disconnect it in <strong>Settings → Integrations</strong>, we delete the associated tokens and stored data for that connection. You may also email us as described above to request deletion.</p>

      <H2>What gets deleted</H2>
      <p>A full account-deletion request removes your account, the access tokens for your connected accounts, and the personal data we hold for you. Some records may be retained where required by law (for example, transaction records) or in backups for a limited period before they are overwritten.</p>

      <H2>Contact</H2>
      <p>Questions about deletion: <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app">admin@aibizconnect.app</a>.</p>
    </LegalShell>
  );
}
