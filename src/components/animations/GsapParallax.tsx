"use client";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface GsapParallaxProps {
  children: ReactNode;
  className?: string;
  y?: number;
  introDelay?: number;
}

export function GsapParallax({
  children,
  className = "",
  y = 70,
  introDelay = 0.25,
}: GsapParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { y: 48, opacity: 0, scale: 0.94, rotateX: 8 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotateX: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: introDelay,
        },
      );

      gsap.to(ref.current, {
        y: -y,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1.2,
        },
      });
    }, ref);

    return () => ctx.revert();
  }, [y, introDelay]);

  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={{ perspective: 1000 }}>
      {children}
    </div>
  );
}
