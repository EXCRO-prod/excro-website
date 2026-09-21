"use client";

import { GsapScrollStagger } from "@/components/animations/GsapScrollStagger";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { STATS } from "@/lib/constants";

export function TrustBar() {
  return (
    <>
      <LogoMarquee />
      <section className="section-band section-surface border-b border-slate-100 bg-gradient-to-r from-primary to-secondary">
        <div className="container-max">
          <GsapScrollStagger className="grid grid-cols-2 gap-8 md:grid-cols-4 ">
            {STATS.map((stat) => (
              <div key={stat.label} className="group text-center">
                <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-primary/20 transition-all group-hover:w-12 group-hover:bg-primary " />
                <p className="text-3xl font-bold text-white md:text-4xl ">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </p>
                <p className="mt-2 text-sm text-blue-100">{stat.label}</p>
              </div>
            ))}
          </GsapScrollStagger>
        </div>
      </section>
    </>
  );
}
