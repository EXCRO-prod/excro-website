"use client";

import { GsapTextReveal } from "@/components/animations/GsapTextReveal";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { motion } from "framer-motion";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface SectionHeaderProps {
  label: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  label,
  title,
  description,
  align = "center",
}: SectionHeaderProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-section-meta]", {
        y: 20,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 90%",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [description]);

  return (
    <div ref={ref} className={`section-title max-w-2xl ${alignClass}`}>
      <span
        data-section-meta
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-light-blue px-4 py-1.5 text-sm font-semibold text-primary"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {label}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        <GsapTextReveal as="span" text={title} delay={0.05} />
      </h2>
      {description && (
        <p data-section-meta className="mt-4 text-lg text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

export function FeaturePill({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm"
    >
      {icon}
      {children}
    </motion.span>
  );
}
