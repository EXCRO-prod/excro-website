"use client";

import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { HOW_IT_WORKS } from "@/lib/constants";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, CheckCircle2 } from "lucide-react";

const MAX_ITEMS = Math.max(...HOW_IT_WORKS.map((step) => step.items.length));

function StepCard({ step, delay }: { step: typeof HOW_IT_WORKS[number]; delay: number }) {
  return (
    <GlowCard delay={delay} hoverLift={false} className="h-full !p-0">
      <div className="flex h-full flex-col p-6 md:p-8">
        <div className="mb-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
          {step.step}
        </div>

        <h3 className="mb-3 min-h-[3.5rem] text-xl font-bold leading-tight text-foreground">
          {step.title}
        </h3>

        <p className="mb-6 min-h-[4.5rem] text-sm leading-relaxed text-muted">
          {step.description}
        </p>

        <ul className="mt-auto space-y-2.5">
          {step.items.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
          {Array.from({ length: MAX_ITEMS - step.items.length }).map((_, i) => (
            <li key={`spacer-${i}`} className="invisible flex items-center gap-2.5 text-sm" aria-hidden="true">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Placeholder</span>
            </li>
          ))}
        </ul>
      </div>
    </GlowCard>
  );
}

function StepConnector() {
  return (
    <div className="flex w-10 shrink-0 items-center justify-center self-center">
      <motion.div
        animate={{ x: [0, 4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
        aria-hidden="true"
      >
        <ArrowRight className="h-4 w-4" />
      </motion.div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-slate-50/50">
      <div className="container-max">
        <SectionHeader
          label="How It Works"
          title="Three steps to secure every transaction"
          description="From escrow creation to automated settlement — built for speed and trust."
        />

        <div className="hidden items-stretch md:flex">
          {HOW_IT_WORKS.flatMap((step, i) => [
            <div key={step.step} className="min-w-0 flex-1">
              <StepCard step={step} delay={i * 0.1} />
            </div>,
            ...(i < HOW_IT_WORKS.length - 1
              ? [<StepConnector key={`connector-${i}`} />]
              : []),
          ])}
        </div>

        <div className="flex flex-col gap-4 md:hidden">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step}>
              <StepCard step={step} delay={i * 0.1} />
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="flex justify-center py-3">
                  <ArrowDown className="h-5 w-5 animate-bounce text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
