"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "EXCRO transformed how we handle marketplace payouts — secure, transparent, and fully automated.",
    author: "Platform Lead",
    company: "B2B Marketplace",
  },
  {
    quote: "Integration took days, not months. The API documentation and sandbox made onboarding seamless.",
    author: "CTO",
    company: "Fintech Startup",
  },
  {
    quote: "Milestone-based escrow gave our clients confidence in every high-value real estate transaction.",
    author: "Operations Head",
    company: "Real Estate Platform",
  },
];

export function TestimonialsStrip() {
  return (
    <section className="section-padding overflow-hidden bg-slate-50/50">
      <div className="container-max">
        <FadeIn>
          <p className="section-title text-center text-sm font-semibold uppercase tracking-widest text-primary">
            What Clients Say
          </p>
        </FadeIn>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item, i) => (
            <FadeIn key={item.company} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -4 }}
                className="gradient-border card-shadow relative h-full rounded-2xl bg-white p-8"
              >
                <Quote className="mb-4 h-8 w-8 text-primary/30" />
                <p className="mb-6 text-sm leading-relaxed text-foreground">&ldquo;{item.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-foreground">{item.author}</p>
                  <p className="text-sm text-muted">{item.company}</p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
