"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { FadeIn } from "@/components/ui/FadeIn";
import { STATS } from "@/lib/constants";

export function StatsStrip() {
  return (
    <section className="section-band relative overflow-hidden border-y border-slate-100 bg-gradient-to-r from-primary to-secondary">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />
      <div className="container-max relative">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08}>
              <div className="text-center">
                <p className="text-2xl font-bold text-white md:text-3xl">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </p>
                <p className="mt-1 text-sm text-blue-100">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
