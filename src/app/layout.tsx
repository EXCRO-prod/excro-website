import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EXCRO — Escrow Infrastructure for Secure Digital Transactions",
    template: "%s | EXCRO",
  },
  description:
    "Protect payments with API-powered escrow, milestone-based releases, vendor payouts, and automated reconciliation. Enterprise-grade escrow infrastructure.",
  keywords: [
    "escrow",
    "fintech",
    "API",
    "payments",
    "marketplace",
    "B2B",
    "settlement",
    "reconciliation",
  ],
  openGraph: {
    title: "EXCRO — Escrow Infrastructure for Secure Digital Transactions",
    description:
      "API-powered escrow infrastructure for enterprises, marketplaces, and fintech platforms.",
    url: "https://www.excro.in",
    siteName: "EXCRO",
    type: "website",
  },
};

// Applies the saved theme before first paint so dark-mode visitors never see a light flash.
// Same storage key as the escrow app (escrow/web) so the two read alike.
const themeScript = `(function(){try{if(localStorage.getItem("excro.theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-white font-sans text-foreground">{children}</body>
    </html>
  );
}
