import { SiteShell } from "@/components/layout/SiteShell";
import { FadeIn } from "@/components/ui/FadeIn";
import { GlowCard } from "@/components/ui/GlowCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Building2, Landmark, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Brief guides to API-powered escrow, RERA accounts, and treasury and cash management from EXCRO.",
};

const ARTICLES: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  action: string;
}> = [
  {
    id: "api-powered-escrow",
    category: "Escrow infrastructure",
    title: "API Powered Escrow",
    description:
      "See how APIs, virtual accounts, and automated release rules turn escrow into a transparent, programmable workflow for banks, platforms, and enterprises.",
    icon: Landmark,
    href: "/api-powered-escrow",
    action: "Explore API Escrow",
  },
  {
    id: "rera-accounts",
    category: "Real estate finance",
    title: "RERA Accounts",
    description:
      "RERA accounts protect homebuyers through a 70% designated-account rule, project-only fund use, certified withdrawals, and a transparent trail for every movement of money.",
    icon: Building2,
    href: "/rera-accounts",
    action: "Read RERA Overview",
  },
  {
    id: "treasury-cash-management",
    category: "Treasury operations",
    title: "Treasury & Cash Management",
    description:
      "Bring balances, reconciliation, matching, and controlled disbursements into one API-driven layer while funds remain in regulated accounts.",
    icon: Wallet,
    href: "/treasury-cash-management",
    action: "Explore Treasury",
  },
];

export default function BlogPage() {
  return (
    <SiteShell>
      <PageHeader
        title="EXCRO Insights"
        description="Brief, practical guides to the infrastructure behind secure money movement."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
        pills={["Escrow infrastructure", "Regulated accounts", "API-first"]}
      />

      <section className="section-padding section-surface">
        <div className="container-max">
          <FadeIn>
            <div className="grid gap-6 lg:grid-cols-3">
              {ARTICLES.map((article) => {
                const Icon = article.icon;

                return (
                  <GlowCard key={article.id} className="flex h-full flex-col">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-light-blue">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
                      {article.category}
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">{article.title}</h2>
                    <p className="mt-4 flex-1 leading-relaxed text-muted">{article.description}</p>
                    <Button variant="outline" size="sm" href={article.href} className="mt-8 self-start">
                      {article.action}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </GlowCard>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

     {/* <section className="section-padding section-surface-alt">
        <div className="container-max space-y-6">
          <FadeIn>
            <article id="rera-accounts" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-8 md:p-10">
              <p className="text-sm font-semibold text-primary">RERA Accounts</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">More control for project collections and releases</h2>
              <p className="mt-4 max-w-3xl leading-relaxed text-muted">
                Under RERA, at least 70% of buyer payments are deposited into a dedicated project account and used only for that project&apos;s land and construction costs. Withdrawals are certified by a Chartered Accountant, Engineer, and Architect against completion milestones. EXCRO digitizes this workflow with automated 70:30 allocation, digital certification, statewise compliance rules, real-time reconciliation, and audit-ready records for builders, certifiers, and banks.
              </p>
            </article>
          </FadeIn>

          <FadeIn>
            <article id="treasury-cash-management" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-8 md:p-10">
              <p className="text-sm font-semibold text-primary">Treasury &amp; Cash Management</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">One operating view for balances and flows</h2>
              <p className="mt-4 max-w-3xl leading-relaxed text-muted">
                Excro unifies cash visibility, reconciliation, matching, and controlled disbursements through an API-driven layer built on its ledger and escrow infrastructure. Corporates gain a single view of balances and flows, while banks can reduce manual treasury operations without replacing their core infrastructure.
              </p>
            </article>
          </FadeIn>
        </div>
      </section> */}
    </SiteShell>
  );
}