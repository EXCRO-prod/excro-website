"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, CheckCircle2, Lock, Send, Users } from "lucide-react";

const STEPS = [
  { icon: Users, label: "Parties Join", color: "bg-blue-50 text-primary" },
  { icon: Lock, label: "Funds Locked", color: "bg-indigo-50 text-indigo-600" },
  { icon: CheckCircle2, label: "Milestones Met", color: "bg-green-50 text-success" },
  { icon: Send, label: "Auto Release", color: "bg-sky-50 text-sky-600" },
];

function StepConnector({ vertical = false }: { vertical?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${
        vertical ? "py-2" : "w-10 self-start pt-6"
      }`}
    >
      <motion.div
        animate={vertical ? { y: [0, 4, 0] } : { x: [0, 4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25"
        aria-hidden="true"
      >
        {vertical ? <ArrowDown className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
      </motion.div>
    </div>
  );
}

function FlowStep({ step, index }: { step: typeof STEPS[number]; index: number }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.15, type: "spring" }}
        whileHover={{ scale: 1.08 }}
        className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${step.color} card-shadow`}
      >
        <step.icon className="h-7 w-7" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
          {index + 1}
        </span>
      </motion.div>
      <p className="mt-3 text-center text-sm font-semibold text-foreground">{step.label}</p>
    </div>
  );
}

export function EscrowFlowDiagram() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-light-blue/30 p-8 md:p-12">
            <div className="pointer-events-none absolute inset-0 dot-grid opacity-30" />
            <h2 className="relative mb-10 text-center text-2xl font-bold text-foreground md:text-3xl">
              How API Powered Escrow Works
            </h2>

            <div className="relative hidden items-start md:flex">
              {STEPS.flatMap((step, i) => [
                <FlowStep key={step.label} step={step} index={i} />,
                ...(i < STEPS.length - 1 ? [<StepConnector key={`connector-${i}`} />] : []),
              ])}
            </div>

            <div className="flex flex-col items-center md:hidden">
              {STEPS.map((step, i) => (
                <div key={step.label} className="flex w-full flex-col items-center">
                  <FlowStep step={step} index={i} />
                  {i < STEPS.length - 1 && <StepConnector vertical />}
                </div>
              ))}
            </div>

            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5 }}
              className="relative mx-auto mt-10 h-1 max-w-md overflow-hidden rounded-full bg-slate-100"
            >
              <div className="h-full w-full bg-gradient-to-r from-primary to-accent shimmer" />
            </motion.div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
