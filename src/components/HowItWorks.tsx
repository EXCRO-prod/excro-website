"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { HOW_IT_WORKS } from "@/lib/constants";
import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2 } from "lucide-react";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-slate-50/50">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              How It Works
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Three steps to secure every transaction
            </h2>
            <p className="mt-4 text-lg text-muted">
              From escrow creation to automated settlement — built for speed and trust.
            </p>
          </div>
        </FadeIn>

        <div className="relative grid gap-8 md:grid-cols-3 md:gap-6">
          {HOW_IT_WORKS.map((step, i) => (
            <FadeIn key={step.step} delay={i * 0.15}>
              <div className="relative">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="card-shadow group h-full rounded-2xl border border-slate-100 bg-white p-8 transition-shadow hover:card-shadow-hover"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-light-blue text-lg font-bold text-primary">
                    {step.step}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mb-6 text-sm leading-relaxed text-muted">{step.description}</p>
                  <ul className="space-y-2">
                    {step.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block">
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                    >
                      →
                    </motion.div>
                  </div>
                )}

                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="flex justify-center py-4 md:hidden">
                    <ArrowDown className="h-5 w-5 text-primary animate-bounce" />
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
