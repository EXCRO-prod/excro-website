import { SiteShell } from "@/components/layout/SiteShell";
import { FinalCTA } from "@/components/FinalCTA";
import { HashScroll } from "@/components/HashScroll";
import { ServiceCard } from "@/components/ServiceCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsStrip } from "@/components/ui/StatsStrip";
import { SERVICES_DETAILED } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "SaaS platforms, KYC validation, ledger management, vendor payouts, reconciliations, and global escrows for enterprises and banks.",
};

export default function OurServicesPage() {
  return (
    <SiteShell>
      <HashScroll />
      <PageHeader
        title="Our Services"
        description="Comprehensive escrow infrastructure for banks, enterprises, and platforms."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Our Services" }]}
        pills={["7 Core Services", "API-first", "Enterprise ready"]}
      />

      {/* <StatsStrip /> */}

      <section className="section-padding">
        <div className="container-max">
          <div className="grid gap-10">
            {SERVICES_DETAILED.map((service, i) => (
              <ServiceCard
                key={service.title}
                title={service.title}
                description={service.description}
                icon={service.icon}
                image={service.image}
                slug={service.slug}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
