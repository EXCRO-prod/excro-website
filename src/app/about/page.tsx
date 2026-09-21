import { SiteShell } from "@/components/layout/SiteShell";
import { ContactForm } from "@/components/ContactForm";
import { FeatureCard } from "@/components/FeatureCard";
import { FinalCTA } from "@/components/FinalCTA";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/GlowCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsStrip } from "@/components/ui/StatsStrip";
import { Timeline } from "@/components/ui/Timeline";
import { Button } from "@/components/ui/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about EXCRO's mission to simplify and secure payments for businesses and individuals using transparent, compliant, and intelligent technology.",
};

const TIMELINE = [
  { year: "2022", title: "Founded", description: "EXCRO was founded by experts blending deep banking knowledge with fintech innovation.", icon: "Rocket" },
  { year: "2023", title: "Platform Launch", description: "Launched API-powered escrow platform with bank-grade security and modular APIs.", icon: "Zap" },
  { year: "2024", title: "Enterprise Scale", description: "Expanded to serve marketplaces, real estate, and B2B platforms across India.", icon: "Building2" },
  { year: "2025", title: "Global Ready", description: "Introduced global escrow flows with multi-currency and cross-border compliance.", icon: "Globe" },
];

const WHAT_WE_DO = [
  { title: "Secure Payment Layer", description: "Acting as a neutral intermediary, EXCRO ensures funds are held only until all parties meet agreed terms.", icon: "Shield" },
  { title: "Milestone-Based Releases", description: "Ideal for project-based payouts, vendor-scoped contracts, or subscription-driven services.", icon: "Zap" },
  { title: "Real-Time Monitoring", description: "Instant notifications and audit-ready logs to track every step of the payment lifecycle.", icon: "Globe" },
  { title: "Custom Workflow Engine", description: "Build escrow dashboards with role-based access, multi-approvals, and automated rules.", icon: "Headphones" },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHeader
        title="About EXCRO"
        description="Empowering digital commerce with trust, security, and simplicity."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        pills={["Founded 2022", "Bengaluru HQ", "Bank-grade security"]}
      />

      <StatsStrip />

      <section className="section-padding section-surface">
        <div className="container-max">
          <div className="grid gap-16 lg:grid-cols-2">
            <FadeIn>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Who We Are</p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Empowering Digital Commerce with Trust, Security & Simplicity
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                At EXCRO, we believe every transaction should be seamless, secure, and smart.
                Born to serve the modern digital economy, our platform delivers next-generation
                payment infrastructure—bringing trust into every transfer.
              </p>
            </FadeIn>

            <FadeIn delay={0.1}>
              <GlowCard className="bg-light-blue/30">
                <h3 className="mb-3 text-lg font-bold text-foreground pt-5">Our Story</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Founded in 2022 by experts blending deep banking knowledge with fintech innovation,
                  EXCRO was built to merge trust and technology with a programmable escrow core.
                </p>
                <h3 className="mb-3 mt-6 text-lg font-bold text-foreground pt-5">Our Mission</h3>
                <p className="text-sm leading-relaxed text-muted">
                  To orchestrate a new era of unified financial innovation—empowering businesses to
                  move money with confidence, clarity, and control.
                </p>
              </GlowCard>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section-padding section-surface-alt">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground pt-5">Our Journey</h2>
          </FadeIn>
          <Timeline items={TIMELINE} />
        </div>
      </section>

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground pt-5">What We Do</h2>
          </FadeIn>
          <div className="grid gap-6 sm:grid-cols-2">
            {WHAT_WE_DO.map((item, i) => (
              <FeatureCard key={item.title} {...item} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface-alt">
        <div className="container-max">
          <div className="grid gap-12 lg:grid-cols-2 pt-5 md:pt-10">
            <FadeIn className="px-3 md:px-0">
              <h2 className="text-3xl font-bold text-foreground">Our Vision for the Future</h2>
              <p className="mt-4 text-muted">
                EXCRO is building the future of payments with embedded escrow, cross-border flows,
                and smart automation.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Embedded escrow for marketplaces, SaaS, and real estate",
                  "Cross-border escrow flows through secure global channels",
                  "Smart automation and predictive transaction management",
                  "Integrations with smart contracts and AI forecasting",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* <div className="mt-8">
                <Button variant="primary" href="/contact">Get in Touch</Button>
              </div> */}
            </FadeIn>
            <FadeIn delay={0.1}>
              <ContactForm showTitle={false} compact />
            </FadeIn>
          </div>
        </div>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
