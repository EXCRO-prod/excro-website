"use client";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { FadeIn } from "@/components/ui/FadeIn";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { STATS } from "@/lib/constants";

export function TrustBar() {
  return (
    <>
      <LogoMarquee />
      <section className="section-band border-b border-slate-100 bg-white">
        <div className="container-max">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={0.1 + i * 0.1}>
                <div className="group text-center">
                  <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-primary/20 transition-all group-hover:w-12 group-hover:bg-primary" />
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
    </>
  );
}
