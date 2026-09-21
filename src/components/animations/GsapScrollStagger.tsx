"use client";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface GsapScrollStaggerProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

export function GsapScrollStagger({
  children,
  className = "",
  stagger = 0.12,
}: GsapScrollStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.from(ref.current!.children, {
        y: 56,
        opacity: 0,
        scale: 0.9,
        duration: 0.75,
        stagger,
        ease: "back.out(1.35)",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 88%",
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
