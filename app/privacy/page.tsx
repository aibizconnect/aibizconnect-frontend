import LegalShell, { H2 } from "@/components/legal/LegalShell";

export const metadata = { title: "Privacy Policy · AIBizConnect", description: "How AIBizConnect collects, uses, and protects data." };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 13, 2026">
      <p>AIBizConnect (&ldquo;AIBizConnect&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the platform at app.aibizconnect.app, which helps businesses build websites and manage marketing, customer relationships, messaging, and payments. This policy explains what we collect, why, and the choices you have. It is provided in good faith and is not legal advice; please have it reviewed by your own counsel before relying on it.</p>

      <H2>Who is responsible for your data</H2>
      <p>For people who sign up to use AIBizConnect (our customers), we are the data controller. For the contacts, leads, and end-customers that our customers manage inside the platform, our customers are the controller and we act as their processor — we handle that data on their behalf and on their instructions.</p>

      <H2>Information we collect</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong>Account &amp; business information</strong> — name, email, business details, and settings you provide.</li>
        <li><strong>CRM &amp; content you add</strong> — contacts, conversations, appointments, opportunities, invoices, forms, and website content you create or import.</li>
        <li><strong>Connected accounts</strong> — when you connect a third-party account (e.g., Facebook/Instagram, Google, Twilio, Stripe), we store the access tokens needed to provide the service. Tokens are encrypted and never shared.</li>
        <li><strong>Messaging data</strong> — the content of messages you send or receive through connected channels (SMS, email, Messenger, Instagram, WhatsApp, web chat) so we can show them in your inbox.</li>
        <li><strong>Usage &amp; device data</strong> — log data, IP address, and basic analytics to operate and secure the service.</li>
      </ul>

      <H2>Data obtained through Facebook &amp; Instagram</H2>
      <p>If you connect a Facebook Page or Instagram business account, we access only what you grant: your Pages, the ability to read and reply to messages, manage posts you authorize, retrieve leads from your lead ads, and read ad insights. This data is used solely to provide the features you enabled (unified inbox, posting, lead capture, reporting). We do not sell it, and we do not use it for advertising or any purpose unrelated to operating your account.</p>

      <H2>How we use information</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>To provide, maintain, and improve the platform and its features.</li>
        <li>To send messages, emails, and other communications <em>that you explicitly initiate or approve</em> — we never send on your behalf automatically.</li>
        <li>To process payments you choose to collect from your own customers.</li>
        <li>To secure the service, prevent abuse, and meter usage for billing.</li>
      </ul>

      <H2>Service providers</H2>
      <p>We use trusted subprocessors to run the platform, including: Supabase (database/storage), Vercel and Cloudflare (hosting/CDN), Meta (Facebook/Instagram/WhatsApp), Google (sign-in, contacts, calendar), Twilio (SMS), Resend (email), Stripe and PayPal (payments), and AI providers (OpenAI, Google AI) for generated content. Each receives only the data needed to perform its function.</p>

      <H2>Data retention</H2>
      <p>We keep your data for as long as your account is active or as needed to provide the service. You can delete content at any time, and you may request deletion of your account and associated data (see Data Deletion below).</p>

      <H2>Your rights</H2>
      <p>You may access, correct, export, or delete your personal data, and withdraw consent for optional processing. To exercise any of these rights, email <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app">admin@aibizconnect.app</a>. End-customers of our customers should contact the business they interacted with; we will assist that business in fulfilling the request.</p>

      <H2>Data deletion</H2>
      <p>To request deletion of your data, see our <a className="text-[#1e3a8a] hover:underline" href="/data-deletion">Data Deletion instructions</a>. You can also disconnect any connected account at any time in Settings → Integrations, which removes the stored tokens for that account.</p>

      <H2>Cookies</H2>
      <p>We use strictly necessary cookies to keep you signed in and to operate the app. We do not use third-party advertising cookies.</p>

      <H2>Security</H2>
      <p>We encrypt secrets and access tokens, scope every record to the owning account, and restrict access to authorized personnel. No system is perfectly secure, but we work to protect your data using industry-standard measures.</p>

      <H2>Changes &amp; contact</H2>
      <p>We may update this policy and will revise the date above when we do. Questions or requests: <a className="text-[#1e3a8a] hover:underline" href="mailto:admin@aibizconnect.app">admin@aibizconnect.app</a>.</p>
    </LegalShell>
  );
}
