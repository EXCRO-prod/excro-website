"use client";

import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ESCROW_PROBLEMS, ESCROW_SOLUTIONS } from "@/lib/constants";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

export function WhatIsEscrow() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.muted = false;
          void video.play().catch(() => {
            video.muted = true;
            void video.play().catch(() => undefined);
          });
        } else {
          video.pause();
          video.muted = true;
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  return (
    <section className="section-padding section-surface relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-blue-50 blur-3xl" />
      <div className="container-max relative pt-5">
        <SectionHeader
          label="What is Escrow?"
          title="Trust is fragile. Escrow makes it secure."
          description="In today's digital economy, payment fraud is real — especially in high-value or unfamiliar transactions."
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <GlowCard delay={0.1} className="border-red-100 bg-red-50/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Problems Without Escrow</h3>
            </div>
            <ul className="space-y-3">
              {ESCROW_PROBLEMS.map((problem, i) => (
                <motion.li
                  key={problem}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-sm text-muted"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {problem}
                </motion.li>
              ))}
            </ul>
          </GlowCard>

          <GlowCard delay={0.2} className="border-green-100 bg-green-50/20">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground">How Escrow Solves This</h3>
            </div>
            <ul className="space-y-3">
              {ESCROW_SOLUTIONS.map((solution, i) => (
                <motion.li
                  key={solution}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 text-sm text-muted"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {solution}
                </motion.li>
              ))}
            </ul>
          </GlowCard>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg shadow-blue-100/40">
          <video
            ref={videoRef}
            className="aspect-video w-full object-cover"
            src="/excro_highlight1.mp4"
            muted
            loop
            controls
            playsInline
            preload="metadata"
            aria-label="Excro escrow platform highlight"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Link
            href="/api-powered-escrow"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-secondary"
          >
            Learn About API Powered Escrow
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
