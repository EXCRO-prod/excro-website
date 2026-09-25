import { SiteShell } from "@/components/layout/SiteShell";
import { EscrowShell } from "@/components/escrow/EscrowShell";
import "@/components/escrow/escrow.css";
import type { Metadata } from "next";

// The Excro Conditional Release platform, served as part of the website under /app.
export const metadata: Metadata = {
  title: "Excro Platform",
  description: "Sign in to manage conditional-release escrow deals, KYC and approvals.",
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: LayoutProps<"/app">) {
  return (
    <SiteShell>
      <EscrowShell>{children}</EscrowShell>
    </SiteShell>
  );
}
