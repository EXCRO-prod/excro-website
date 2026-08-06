"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SOLUTIONS } from "@/lib/constants";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export function Solutions() {
  return (
    <section id="solutions" className="section-padding bg-slate-50/50">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Solutions
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Complete escrow infrastructure
            </h2>
            <p className="mt-4 text-lg text-muted">
              Modular solutions that scale from single transactions to enterprise platforms.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SOLUTIONS.map((solution, i) => (
            <FadeIn key={solution.name} delay={i * 0.05}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group card-shadow relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 transition-all hover:card-shadow-hover hover:border-primary/20"
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-light-blue opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 flex items-start justify-between">
                    <h3 className="text-lg font-bold text-foreground">{solution.name}</h3>
                    <ArrowUpRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-primary" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{solution.description}</p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
