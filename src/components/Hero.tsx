"use client";

import { GsapMagnetic } from "@/components/animations/GsapMagnetic";
import { GsapParallax } from "@/components/animations/GsapParallax";
import { GsapTextReveal } from "@/components/animations/GsapTextReveal";
import { DashboardMockup } from "@/components/DashboardMockup";
import { Button } from "@/components/ui/Button";
import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { ArrowRight, Play } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

export function Hero() {
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-hero-fade]", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.15,
      });

      gsap.from("[data-hero-trust]", {
        y: 16,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.9,
      });

      gsap.set("[data-hero-subline-mobile]", { yPercent: 110, opacity: 0 });
      gsap.to("[data-hero-subline-mobile]", {
        yPercent: 0,
        opacity: 1,
        duration: 0.85,
        ease: "power3.out",
        delay: 0.22,
      });
    }, contentRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="page-hero" className="page-hero hero-grid relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <FloatingOrbs />
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-blue-100/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-100/25 blur-3xl" />
      </div>
      <div className="container-max relative z-10">
        <div ref={contentRef} className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div data-hero-fade className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-light-blue px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                SaaS Platform for Banks and Businesses
              </span>
            </div>

            <h1 className="text-[1.875rem] font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[64px] lg:leading-[1.1]">
              {/* Mobile: tighter two-line layout */}
              <span className="lg:hidden">
                <GsapTextReveal
                  animate="line"
                  text="API Powered Escrows"
                  className="block"
                  delay={0.05}
                />
                <span className="mt-1 block overflow-hidden pb-[0.1em]">
                  <span
                    data-hero-subline-mobile
                    className="inline-block will-change-transform text-foreground"
                  >
                    for{" "}
                    <span className="gradient-text">Businesses and Individuals</span>
                  </span>
                </span>
              </span>

              {/* Desktop: full headline with gradient second line */}
              <span className="hidden lg:block">
                <GsapTextReveal
                  animate="line"
                  text="API Powered Escrows for"
                  className="block"
                  delay={0.05}
                />
                <GsapTextReveal
                  animate="line"
                  text="Businesses and Individuals"
                  variant="gradient"
                  className="block"
                  delay={0.22}
                />
              </span>
            </h1>

            <p data-hero-fade className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Protect payments between buyers and sellers with API-powered escrow,
              milestone-based releases, vendor payouts, and automated reconciliation.
            </p>

            <div data-hero-fade className="mt-8 flex flex-wrap items-center gap-4">
              <GsapMagnetic>
                <Button variant="primary" size="lg" href="/contact">
                  Book a Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </GsapMagnetic>
              <GsapMagnetic strength={0.18}>
                <Button variant="outline" size="lg" href="/contact">
                  <Play className="h-4 w-4" />
                  Talk to an Expert
                </Button>
              </GsapMagnetic>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted">
              {["Bank-grade security", "RBI compliant", "99.9% uptime"].map((item) => (
                <div key={item} data-hero-trust className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                    <span className="text-success text-xs">✓</span>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <GsapParallax className="hidden lg:block" y={90}>
            <DashboardMockup />
          </GsapParallax>
          <div className="lg:hidden">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
