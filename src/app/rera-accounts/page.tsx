import { SiteShell } from "@/components/layout/SiteShell";
import { FinalCTA } from "@/components/FinalCTA";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/GlowCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  BadgeCheck,
  Building2,
  FileCheck2,
  Landmark,
  Map,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RERA Accounts",
  description:
    "Digitize RERA account operations with controlled fund flows, certified withdrawals, statewise compliance, and real-time reconciliation.",
};

const WORKFLOW = [
  {
    title: "70% designated account",
    description: "Route at least 70% of buyer payments into a dedicated project account.",
    icon: WalletCards,
  },
  {
    title: "Project-only usage",
    description: "Keep designated funds tied to the project's land and construction costs.",
    icon: Building2,
  },
  {
    title: "Certified withdrawals",
    description: "Capture CA, Engineer, and Architect approvals against completion milestones.",
    icon: BadgeCheck,
  },
  {
    title: "Transparent trail",
    description: "Maintain real-time records for reconciliation, reporting, and audit readiness.",
    icon: FileCheck2,
  },
];

const FEATURES: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "Automated 70:30 split",
    description: "Manage designated and transaction accounts digitally with fewer allocation errors.",
    icon: RefreshCw,
  },
  {
    title: "Digital certification workflow",
    description: "Upload, verify, and track professional approvals before drawdown requests move forward.",
    icon: FileCheck2,
  },
  {
    title: "Statewise compliance",
    description: "Apply the right account naming and operating rules across state circulars and project types.",
    icon: Map,
  },
  {
    title: "Real-time reconciliation",
    description: "Monitor inflows, utilization, and balances through a unified operational view.",
    icon: RefreshCw,
  },
  {
    title: "Escrow-grade security",
    description: "Build on regulated account infrastructure with controlled access and complete audit trails.",
    icon: ShieldCheck,
  },
  {
    title: "Bank-ready APIs",
    description: "Deploy as an integrated API or white-label module alongside existing banking workflows.",
    icon: Landmark,
  },
];

const OPERATING_CHALLENGES = [
  "Each state enforces its own circulars and account naming rules.",
  "Builders coordinate with multiple banks and certifiers manually.",
  "Banks must maintain strict adherence to RERA directions and audits.",
  "Offline document handling creates delays, duplication, and errors.",
];

const WHY_EXCRO = [
  {
    title: "Deep banking DNA",
    description: "Built by escrow and transaction banking experts.",
    icon: Landmark,
  },
  {
    title: "Statewise compliance library",
    description: "Keep operating rules aligned with applicable RERA circulars.",
    icon: Map,
  },
  {
    title: "Bank-grade security",
    description: "Use an audit-ready platform with controlled access and traceable records.",
    icon: ShieldCheck,
  },
  {
    title: "Faster go-live",
    description: "Onboard projects in days with reusable workflows and bank integrations.",
    icon: BadgeCheck,
  },
];

const STATEWISE_STRUCTURES = [
  ["Maharashtra", "Collection; Separate (70%); Transaction (30%)", "MahaRERA Circular"],
  ["Karnataka", "Single RERA bank account, project-specific", "KRERA Regulations"],
  ["Gujarat", "Collection; Retention/Separate (70%); Transaction", "GujRERA Directions"],
  ["Uttar Pradesh", "Collection; Separate (70%); Transaction", "UP-RERA Circular"],
  ["Haryana", "Collection; Separate (70%); Transaction", "Haryana RERA Regulation"],
  ["Delhi (NCT)", "Project RERA escrow; Collection; Transaction", "Delhi RERA Guidelines"],
  ["Kerala", "Collection; Separate (70%)", "Kerala RERA"],
  ["Andhra Pradesh", "Collection; Separate (70%); Transaction", "AP RERA Directions"],
  ["Telangana", "Collection; Separate (70%); Transaction", "TG RERA Circular"],
  ["Rajasthan", "Separate/Retention (70%); project-specific naming", "Rajasthan RERA Order"],
  ["Punjab", "Collection; Special/Separate (70%)", "Punjab RERA Checklist"],
  ["Tamil Nadu", "Collection; Separate (70% escrow); Transaction", "TNRERA"],
];

export default function ReraAccountsPage() {
  return (
    <SiteShell>
      <PageHeader
        title="RERA Accounts"
        description="Transparency and compliance made simple for builders, banks, and real estate projects."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "RERA Accounts" }]}
        pills={["70% designated account", "Statewise compliance", "Audit ready"]}
      />

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-light-blue/60 to-white p-8 md:p-12">
              <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
              <div className="relative">
                <p className="text-lg leading-relaxed text-muted">
                  When homebuyers invest in a new project, RERA protects that trust through clear rules for how project funds are held and used. EXCRO gives builders, certifiers, and banks a connected digital framework for fund control, documentation, and reporting.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="primary" href="/contact">
                    Talk to Our Team
                  </Button>
                  <Button variant="outline" href="#rera-workflow">
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
              Why Builders and Banks Need a Smarter Way
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              The principle is simple, but execution varies across states and projects. A unified digital framework removes the operational complexity.
            </p>
          </FadeIn>

          <div className="grid gap-4 md:grid-cols-2">
            {OPERATING_CHALLENGES.map((challenge, index) => (
              <GlowCard key={challenge} delay={index * 0.06}>
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-500">
                    {index + 1}
                  </span>
                  <p className="leading-relaxed text-muted">{challenge}</p>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      <section id="rera-workflow" className="section-padding section-surface-alt scroll-mt-24">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              How a RERA Account Works
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              A controlled, certified, and traceable funding process keeps buyer money connected to the project it is meant to build.
            </p>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW.map((item, index) => {
              const Icon = item.icon;
              return (
                <GlowCard key={item.title} delay={index * 0.08}>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-light-blue">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">
                    Step {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.description}</p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              The EXCRO Digital RERA Framework
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              Replace fragmented bank, builder, and certifier coordination with one API-ready operating layer.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <GlowCard key={feature.title} delay={index * 0.06}>
                  <Icon className="mb-4 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface-alt">
        <div className="container-max grid gap-6 md:grid-cols-2">
          <GlowCard>
            <Building2 className="mb-4 h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">For Developers &amp; Builders</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Simplify project compliance from day one with faster setup, automated fund tracking, digital records, milestone approvals, and transparent dashboards.
            </p>
          </GlowCard>
          <GlowCard>
            <Landmark className="mb-4 h-7 w-7 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">For Banks &amp; Financial Institutions</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Launch RERA-compliant solutions through an integrated or white-label API, with unified monitoring across RERA and loan escrow layers.
            </p>
          </GlowCard>
        </div>
      </section>

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Why EXCRO
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-center text-muted lg:mb-16">
              Compliance should empower teams, not complicate them.
            </p>
          </FadeIn>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_EXCRO.map((item, index) => {
              const Icon = item.icon;
              return (
                <GlowCard key={item.title} delay={index * 0.06}>
                  <Icon className="mb-4 h-6 w-6 text-primary" />
                  <h3 className="mb-2 font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{item.description}</p>
                </GlowCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-padding section-surface-alt">
        <div className="container-max">
          <FadeIn>
            <h2 className="section-title text-center text-3xl font-bold text-foreground">
              Statewise RERA Account Structures
            </h2>
            <p className="mx-auto mb-10 max-w-3xl text-center text-muted">
              Under Section 4(2)(l)(D) of RERA, 70% of buyer funds must be deposited in a dedicated project account and used only for that project&apos;s development. Account names and structures can vary by state.
            </p>
          </FadeIn>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-light-blue text-foreground">
                <tr>
                  <th className="px-5 py-4 font-semibold">State</th>
                  <th className="px-5 py-4 font-semibold">Typical structure</th>
                  <th className="px-5 py-4 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-muted">
                {STATEWISE_STRUCTURES.map(([state, structure, reference]) => (
                  <tr key={state}>
                    <td className="px-5 py-4 font-semibold text-foreground">{state}</td>
                    <td className="px-5 py-4">{structure}</td>
                    <td className="px-5 py-4">{reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FinalCTA />
    </SiteShell>
  );
}
