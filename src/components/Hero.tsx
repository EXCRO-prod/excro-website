"use client";

import { DashboardMockup } from "@/components/DashboardMockup";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";

export function Hero() {
  return (
    <section id="page-hero" className="page-hero hero-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <FloatingOrbs />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-100/25 blur-3xl" />
      </div>
      <div className="container-max relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <FadeIn>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-light-blue px-4 py-1.5">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-primary">
                  SaaS Platform for Banks and Businesses
                </span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[64px]">
                API Powered Escrows for{" "}
                <span className="gradient-text">Businesses and Individuals</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                Protect payments between buyers and sellers with API-powered escrow,
                milestone-based releases, vendor payouts, and automated reconciliation.
              </p>
            </FadeIn>

            <FadeIn delay={0.3}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button variant="primary" size="lg" href="/contact">
                  Book a Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" href="/contact">
                  <Play className="h-4 w-4" />
                  Talk to an Expert
                </Button>
              </div>
            </FadeIn>

            <FadeIn delay={0.4}>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  Bank-grade security
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  RBI compliant
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  99.9% uptime
                </div>
              </div>
            </FadeIn>
          </div>

          <FadeIn direction="left" delay={0.2}>
            <DashboardMockup />
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
