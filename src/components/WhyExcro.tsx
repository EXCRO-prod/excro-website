"use client";

import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BENEFITS } from "@/lib/constants";
import {
  Code2,
  Globe,
  LayoutDashboard,
  Scale,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Zap,
  Code2,
  Scale,
  Globe,
  LayoutDashboard,
};

export function WhyExcro() {
  return (
    <section className="section-padding section-surface-alt">
      <div className="container-max pt-5">
        <SectionHeader
          label="Why EXCRO"
          title="Why Choose EXCRO?"
          description="EXCRO simplifies secure transactions between untrusted parties with API-powered escrow."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => {
            const Icon = ICON_MAP[benefit.icon] || Shield;
            return (
              <GlowCard key={benefit.title} delay={i * 0.08}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-light-blue transition-colors group-hover:bg-primary">
                  <Icon className="h-6 w-6 text-primary transition-colors group-hover:text-white" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-foreground">{benefit.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{benefit.description}</p>
              </GlowCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
