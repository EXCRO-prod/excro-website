"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { INDUSTRIES } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  Briefcase,
  Building2,
  ClipboardList,
  Globe,
  HardHat,
  HeartPulse,
  Laptop,
  ShieldCheck,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Store,
  Building2,
  HardHat,
  Laptop,
  HeartPulse,
  ShieldCheck,
  Truck,
  Briefcase,
  ClipboardList,
  Globe,
};

export function Industries() {
  return (
    <section id="industries" className="section-padding">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Who Is It For
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Built for every high-value transaction
            </h2>
            <p className="mt-4 text-lg text-muted">
              From marketplaces to cross-border trade — EXCRO adapts to your industry.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {INDUSTRIES.map((industry, i) => {
            const Icon = ICON_MAP[industry.icon] || Store;
            return (
              <FadeIn key={industry.name} delay={i * 0.05}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="card-shadow group cursor-default rounded-2xl border border-slate-100 bg-white p-6 transition-shadow hover:card-shadow-hover"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-light-blue transition-colors group-hover:bg-primary">
                    <Icon className="h-5 w-5 text-primary transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="mb-2 font-bold text-foreground">{industry.name}</h3>
                  <p className="text-sm leading-relaxed text-muted">{industry.description}</p>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
