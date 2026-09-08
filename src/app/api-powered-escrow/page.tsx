import { SiteShell } from "@/components/layout/SiteShell";
import { EscrowFlowDiagram } from "@/components/EscrowFlowDiagram";
import { FinalCTA } from "@/components/FinalCTA";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/GlowCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsStrip } from "@/components/ui/StatsStrip";
import { Button } from "@/components/ui/Button";
import {
  ESCROW_ADVANTAGES,
  ESCROW_SCOPE,
  TRUSTEE_ENTITIES,
} from "@/lib/constants";
import {
  Building2,
  Laptop,
  ShoppingBag,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Powered Escrow",
  description:
    "Learn how API-powered escrow works, its advantages over traditional escrows, scope of applications, and how EXCRO can help your business.",
};

const SCOPE_ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  Building2,
  TrendingUp,
  Laptop,
};

const ADVANTAGE_ICONS = [Zap, TrendingUp, ShoppingBag, Building2, Laptop, Zap];

export default function ApiPoweredEscrowPage() {
  return (
    <SiteShell>
      <PageHeader
        title="API Powered Escrow"
        description="A modern overview of digital escrow infrastructure powered by APIs, encryption, and real-time tracking."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "API Powered Escrow" },
        ]}
        pills={["Digital-first", "Automated releases", "Trustee-backed"]}
      />

      {/* <StatsStrip /> */}

      <section className="section-padding">
        <div className="container-max">
          <FadeIn>
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-light-blue/50 to-white p-10 text-center">
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
              <p className="relative text-lg leading-relaxed text-muted">
                API powered escrow is a financial arrangement where an impartial third-party agent
                holds funds until predefined contract conditions are met—leveraging virtual accounts,
                APIs, and online platforms for seamless, automated releases.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      <EscrowFlowDiagram />

      <section className="section-padding bg-slate-50/50">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Advantages Over Traditional Escrows
            </h2>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ESCROW_ADVANTAGES.map((row, i) => {
              const Icon = ADVANTAGE_ICONS[i] || Zap;
              return (
                <GlowCard key={row.advantage} delay={i * 0.05}>
                  <Icon className="mb-3 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-bold text-primary">{row.advantage}</h3>
                  <p className="mb-3 text-sm text-muted">{row.description}</p>
                  <p className="rounded-lg bg-light-blue/50 p-3 text-xs text-foreground">
                    <span className="font-semibold">EXCRO:</span> {row.help}
                  </p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Scope of Application
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              Key industries where trust, fraud prevention, and conditional releases are critical.
            </p>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2">
            {ESCROW_SCOPE.map((item, i) => {
              const Icon = SCOPE_ICONS[item.icon] || ShoppingBag;
              return (
                <GlowCard key={item.title} delay={i * 0.1}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-light-blue">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted">{item.description}</p>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding bg-slate-50/50">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Who Can Be a Trustee
            </h2>
          </FadeIn>

          <div className="space-y-6">
            {TRUSTEE_ENTITIES.map((entity, i) => (
              <GlowCard key={entity.type} delay={i * 0.1}>
                <h3 className="mb-2 text-lg font-bold text-primary">{entity.type}</h3>
                <div className="grid gap-2 text-sm text-muted md:grid-cols-3">
                  <p><span className="font-medium text-foreground">Basis:</span> {entity.basis}</p>
                  <p><span className="font-medium text-foreground">Criteria:</span> {entity.criteria}</p>
                  <p><span className="font-medium text-foreground">Examples:</span> {entity.examples}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* <section className="section-padding relative overflow-hidden bg-primary">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-10" />
        <div className="container-max relative text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold text-white">How EXCRO Can Help</h2>
            <p className="mx-auto mt-4 max-w-2xl text-blue-100">
              With banking experience and trustee partnerships, EXCRO helps you build and scale
              API powered escrow solutions in India&apos;s fintech ecosystem.
            </p>
            <div className="mt-8">
              <Button variant="secondary" size="lg" href="/contact" className="bg-white text-primary hover:bg-blue-50">
                Talk to Our Team
              </Button>
            </div>
          </FadeIn>
        </div>
      </section> */}

      <FinalCTA />
    </SiteShell>
  );
}
