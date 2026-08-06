"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { FadeIn } from "@/components/ui/FadeIn";
import { STATS, TRUST_LOGOS } from "@/lib/constants";

export function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-white py-16">
      <div className="container-max px-6 md:px-12 lg:px-20">
        <FadeIn>
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-muted">
            Trusted By
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mb-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {TRUST_LOGOS.map((logo) => (
              <span
                key={logo}
                className="text-lg font-bold tracking-tight text-slate-300 transition-colors hover:text-slate-400"
              >
                {logo}
              </span>
            ))}
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={0.1 + i * 0.1}>
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground md:text-4xl">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </p>
                <p className="mt-2 text-sm text-muted">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
