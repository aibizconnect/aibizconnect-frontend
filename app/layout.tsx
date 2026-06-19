import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import ThemeWrapper from "@/components/ThemeWrapper";
import "./globals.css";

// Roboto is the app/dashboard UI font (per Ali). Exposed as --font-geist-sans so
// the existing @theme --font-sans mapping picks it up without further changes.
const roboto = Roboto({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aibizconnect.app"),
  title: { default: "AIBizConnect OS — run your entire business with AI", template: "%s · AIBizConnect OS" },
  description: "AIBizConnect OS — the AI Business OS for small business: website, CRM, funnels, email & social, and a 24/7 AI concierge, in one platform. Live the same day.",
  applicationName: "AIBizConnect OS",
  keywords: ["AI business platform", "AI website builder", "CRM", "marketing automation", "AI concierge", "small business software", "all-in-one business OS"],
  authors: [{ name: "AIBizConnect" }],
  icons: { icon: "/abc/favicon-48.png", shortcut: "/abc/favicon-48.png", apple: "/abc/icon-192.png" },
  openGraph: {
    type: "website",
    siteName: "AIBizConnect OS",
    url: "https://aibizconnect.app",
    title: "AIBizConnect OS — run your entire business with AI",
    description: "One platform that builds your website, fills your CRM, books your calendar, and markets for you — with a 24/7 AI concierge.",
    images: [{ url: "/brand/AIBizConnect-logo-primary.png", width: 2505, height: 624, alt: "AIBizConnect OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIBizConnect OS — run your entire business with AI",
    description: "The AI Business OS for small business. Website, CRM, funnels, marketing, and a 24/7 AI concierge in one platform.",
    images: ["/brand/AIBizConnect-logo-primary.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        {/* ABC design-system fonts (Claude Design handoff): Montserrat body + Roboto Mono. MontserratAlt1 display is @font-face'd in globals.css. */}
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeWrapper>
          {children}
        </ThemeWrapper>
      </body>
    </html>
  );
}
