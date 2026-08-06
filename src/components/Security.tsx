"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { SECURITY_FEATURES } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  FileCheck,
  KeyRound,
  Lock,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Lock,
  FileCheck,
  KeyRound,
  AlertTriangle,
  ScrollText,
  Users,
};

export function Security() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Security
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Trust built into every layer
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Bank-regulated trust accounts, end-to-end encryption, and comprehensive
              compliance — so your transactions are protected at every step.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {["SOC 2 Ready", "RBI Compliant", "ISO 27001", "PCI DSS"].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-foreground"
                >
                  {badge}
                </span>
              ))}
            </div>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2">
            {SECURITY_FEATURES.map((feature, i) => {
              const Icon = ICON_MAP[feature.icon] || Lock;
              return (
                <FadeIn key={feature.title} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="rounded-2xl border border-slate-100 bg-light-blue/50 p-6"
                  >
                    <Icon className="mb-3 h-6 w-6 text-primary" />
                    <h3 className="mb-2 font-bold text-foreground">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{feature.description}</p>
                  </motion.div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
