import LegalShell, { H2 } from "@/components/legal/LegalShell";

export const metadata = { title: "Terms of Service · AIBizConnect", description: "The terms that govern your use of AIBizConnect." };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 13, 2026">
      <p>These Terms govern your access to and use of AIBizConnect (the &ldquo;Service&rdquo;) at app.aibizconnect.app. By creating an account or using the Service, you agree to these Terms. This document is provided in good faith and is not legal advice.</p>

      <H2>Your account</H2>
      <p>You must provide accurate information and are responsible for activity under your account and for keeping your credentials secure. You may invite team members and assign them roles; you remain responsible for their use of the Service.</p>

      <H2>Acceptable use</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Use the Service lawfully and only to communicate with people who have consented to hear from you.</li>
        <li>Do not send spam, harass, or violate the policies of connected providers (e.g., Meta, Twilio, email/anti-spam laws such as CASL, CAN-SPAM, GDPR, and carrier/A2P rules).</li>
        <li>Do not attempt to disrupt, reverse engineer, or gain unauthorized access to the Service.</li>
      </ul>

      <H2>Messaging &amp; consent</H2>
      <p>The Service never sends messages, emails, or texts automatically — every send is initiated or approved by you. You are responsible for having a lawful basis and consent to contact your recipients, for honoring opt-outs (including STOP/unsubscribe), and for the content you send. We provide compliance tooling (do-not-contact exclusions, opt-out handling), but you remain responsible for your communications.</p>

      <H2>Connected accounts</H2>
      <p>When you connect third-party accounts, you authorize us to access them on your behalf to provide the features you enable, subject to each provider&rsquo;s terms. You can disconnect at any time in Settings.</p>

      <H2>Payments</H2>
      <p>If you use the Service to invoice or collect payments, those transactions are processed by your connected payment provider (e.g., Stripe, PayPal). We facilitate the creation of invoices and customer-initiated payment links; we do not charge your customers on your behalf. Fees for the Service itself, including metered usage, are billed per your plan.</p>

      <H2>Your content</H2>
      <p>You retain ownership of the content and data you put into the Service. You grant us the limited rights needed to host and process it to operate the Service for you.</p>

      <H2>Disclaimers</H2>
      <p>The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that it will be uninterrupted, error-free, or that AI-generated content will be accurate. You are responsible for reviewing content before you publish or send it.</p>

      <H2>Limitation of liability</H2>
      <p>To the maximum extent permitted by law, AIBizConnect will not be liable for indirect, incidental, or consequential damages, and our total liability for any claim is limited to the amount you paid for the Service in the three months before the claim.</p>

      <H2>Termination</H2>
      <p>You may stop using the Service at any time. We may suspend or terminate accounts that violate these Terms. On termination you may export your data for a reasonable period, after which it may be deleted.</p>

      <H2>Governing law</H2>
      <p>These Terms are governed by the laws of the Province of Ontario, Canada, without regard to conflict-of-laws rules.</p>

      <H2>Contact</H2>
      <p>Questions about these Terms: <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app">admin@aibizconnect.app</a>.</p>
    </LegalShell>
  );
}
