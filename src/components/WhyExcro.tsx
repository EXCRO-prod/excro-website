"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { BENEFITS } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  Code2,
  Headphones,
  RefreshCw,
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
  RefreshCw,
  Headphones,
};

export function WhyExcro() {
  return (
    <section id="about" className="section-padding bg-slate-50/50">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Why EXCRO
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Enterprise-grade from day one
            </h2>
            <p className="mt-4 text-lg text-muted">
              Built for platforms that can&apos;t afford to compromise on security, speed, or scale.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => {
            const Icon = ICON_MAP[benefit.icon] || Shield;
            return (
              <FadeIn key={benefit.title} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="card-shadow group rounded-2xl border border-slate-100 bg-white p-8 transition-shadow hover:card-shadow-hover"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-light-blue transition-colors group-hover:bg-primary">
                    <Icon className="h-6 w-6 text-primary transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="mb-3 text-lg font-bold text-foreground">{benefit.title}</h3>
                  <p className="text-sm leading-relaxed text-muted">{benefit.description}</p>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
