import { SiteShell } from "@/components/layout/SiteShell";
import { FinalCTA } from "@/components/FinalCTA";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/GlowCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  Banknote,
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Landmark,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  Send,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Treasury & Cash Management",
  description:
    "Real-time treasury operations for corporates, banks, NBFCs, and platforms with unified cash visibility, reconciliation, and controlled disbursements.",
};

const ADVANTAGES: Array<{
  title: string;
  description: string;
  delivery: string;
  icon: LucideIcon;
}> = [
  {
    title: "Unified cash visibility",
    description: "One dashboard for balances, inflows, and outflows across accounts instead of manual bank statement reconciliation.",
    delivery: "Built on Excro's Ledger Management, mapped in real time across customers, vendors, and escrow accounts.",
    icon: LayoutDashboard,
  },
  {
    title: "Automated reconciliation",
    description: "Match transactions across banks and accounts without manual spreadsheet work.",
    delivery: "Powered by Excro's existing Reconciliations engine.",
    icon: RefreshCw,
  },
  {
    title: "Controlled disbursements",
    description: "Release funds only when conditions or milestones are met, reducing leakage.",
    delivery: "Built on Excro's Vendor Payout and escrow-release workflows.",
    icon: Send,
  },
  {
    title: "Compliance-first by default",
    description: "Keep AML and KYC checks connected to every counterparty from the beginning.",
    delivery: "Reuses Excro's KYC Validation stack.",
    icon: LockKeyhole,
  },
  {
    title: "Cross-border ready",
    description: "Manage multi-currency cash positions without separate infrastructure for every geography.",
    delivery: "Extends Excro's Global Escrows rails.",
    icon: Globe2,
  },
  {
    title: "Audit-ready reporting",
    description: "Generate point-in-time and periodic reports for banks, regulators, and finance teams.",
    delivery: "Native to the ledger and reconciliation modules.",
    icon: FileCheck2,
  },
];

const AUDIENCES: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "Corporate treasury desks",
    description: "Get real-time balance visibility, payout automation, and reconciliation without manual operations.",
    icon: Building2,
  },
  {
    title: "Banks & NBFCs",
    description: "Offer a white-labelled treasury and cash-management SaaS layer to corporate clients without building it in-house.",
    icon: Landmark,
  },
  {
    title: "Marketplaces & platforms",
    description: "Apply treasury-style controls to pooled or nodal accounts, vendor payouts, and settlement flows.",
    icon: WalletCards,
  },
];

const OPERATIONS = [
  "Pull balances and transaction data from core banking systems through APIs.",
  "Apply ledger logic and map activity across accounts, customers, vendors, and escrow flows.",
  "Run reconciliation and surface exceptions through a single operational view.",
  "Trigger payouts or escrow releases based on rules defined by your business.",
];

export default function TreasuryCashManagementPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Treasury & Cash Management"
        description="Real-time control over corporate cash, backed by escrow-grade security."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Treasury & Cash Management" }]}
        pills={["Unified cash visibility", "Automated reconciliation", "Controlled disbursements"]}
      />

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-light-blue/60 to-white p-8 md:p-12">
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
              <div className="relative">
                <p className="text-lg leading-relaxed text-muted">
                  Modern treasury teams need one view of where money sits, how it moves, and how fast it can be reconciled. Excro&apos;s Treasury &amp; Cash Management layer sits on top of our ledger, reconciliation, escrow, and payout infrastructure to give corporates and banks a single, API-driven control plane for cash.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="primary" href="/contact">
                    Talk to Our Team
                  </Button>
                  <Button variant="outline" href="#how-it-works">
                    See How It Works
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-padding section-surface-alt">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Advantages Over Siloed Treasury Tools
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              Bring visibility, control, and compliance together instead of stitching together disconnected systems.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ADVANTAGES.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <GlowCard key={advantage.title} delay={index * 0.06}>
                  <Icon className="mb-4 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-bold text-foreground">{advantage.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{advantage.description}</p>
                  <p className="mt-4 rounded-lg bg-light-blue/60 p-3 text-xs leading-relaxed text-foreground">
                    <span className="font-semibold text-primary">How Excro delivers:</span> {advantage.delivery}
                  </p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">Scope</h2>
          </FadeIn>
          <div className="grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((audience, index) => {
              const Icon = audience.icon;
              return (
                <GlowCard key={audience.title} delay={index * 0.08}>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-light-blue">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{audience.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{audience.description}</p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section-padding section-surface-alt scroll-mt-24">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              Excro sits above core banking through APIs, providing orchestration and visibility while banks keep custody of funds.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2">
            {OPERATIONS.map((operation, index) => (
              <GlowCard key={operation} delay={index * 0.06}>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="leading-relaxed text-muted">{operation}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <Banknote className="mx-auto mb-5 h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Extend proven banking operations into treasury</h2>
              <p className="mt-5 leading-relaxed text-muted">
                With banking-ops experience and an existing escrow, KYC, ledger, and reconciliation stack, Excro can extend treasury and cash management as a natural upsell to escrow clients and a new wedge into corporate treasury desks and bank partnerships, without building new core infrastructure from scratch.
              </p>
              <div className="mt-8">
                <Button variant="primary" size="lg" href="/contact">
                  Discuss Treasury Operations
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
