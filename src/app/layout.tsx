import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EXCRO — Escrow Infrastructure for Secure Digital Transactions",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full scroll-smooth antialiased`}>
      <body className="min-h-full bg-white font-sans text-foreground">{children}</body>
    </html>
  );
}
