"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { FileText, Shield } from "lucide-react";

interface LegalSection {
  title: string;
  content: string;
}

interface LegalContentProps {
  intro: string;
  sections: LegalSection[];
  icon?: "terms" | "privacy";
}

export function LegalContent({ intro, sections, icon = "terms" }: LegalContentProps) {
  const Icon = icon === "privacy" ? Shield : FileText;

  return (
    <section className="section-padding section-surface">
      <div className="container-max">
        <div className="grid gap-12 lg:grid-cols-4">
          <FadeIn className="lg:col-span-1">
            <div className="sticky top-28">
              <div className="card-shadow rounded-2xl border border-slate-100 bg-white p-6">
                <Icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="font-bold text-foreground">Quick Navigation</h3>
                <nav className="mt-4 space-y-2">
                  {sections.map((section) => (
                    <a
                      key={section.title}
                      href={`#${section.title.replace(/\s+/g, "-").toLowerCase()}`}
                      className="block text-sm text-muted transition-colors hover:text-primary"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </FadeIn>

          <div className="lg:col-span-3">
            <FadeIn delay={0.1}>
              <div className="mb-10 rounded-2xl border border-slate-100 bg-light-blue/30 p-6">
                <p className="text-muted">{intro}</p>
              </div>
            </FadeIn>

            <div className="space-y-10">
              {sections.map((section, i) => (
                <FadeIn key={section.title} delay={0.05 + i * 0.03}>
                  <div
                    id={section.title.replace(/\s+/g, "-").toLowerCase()}
                    className="scroll-mt-28 border-b border-slate-100 pb-8 last:border-b-0"
                  >
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-light-blue text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      {section.title}
                    </h2>
                    <p className="text-sm leading-relaxed text-muted">{section.content}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
