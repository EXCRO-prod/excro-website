"use client";

import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { useLayoutEffect, useRef } from "react";

interface GsapTextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  variant?: "default" | "gradient";
  /** "words" splits each word; "line" keeps natural wrapping for headlines */
  animate?: "words" | "line";
}

export function GsapTextReveal({
  text,
  className = "",
  delay = 0,
  as = "span",
  variant = "default",
  animate = "words",
}: GsapTextRevealProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const targets = ref.current.querySelectorAll("[data-word]");
    if (prefersReducedMotion() || targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { yPercent: 110, opacity: 0, rotate: animate === "words" ? 2 : 0 });
      gsap.to(targets, {
        yPercent: 0,
        opacity: 1,
        rotate: 0,
        duration: animate === "words" ? 0.75 : 0.85,
        stagger: animate === "words" ? 0.04 : 0,
        ease: "power3.out",
        delay,
      });
    }, ref);

    return () => ctx.revert();
  }, [text, delay, animate]);

  const Tag = as;
  const wordClass =
    variant === "gradient"
      ? "gradient-text inline-block will-change-transform"
      : "inline-block will-change-transform";

  if (animate === "line") {
    return (
      <Tag ref={ref as never} className={className}>
        <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
          <span data-word className={variant === "gradient" ? "gradient-text inline-block will-change-transform" : "inline-block will-change-transform"}>
            {text}
          </span>
        </span>
      </Tag>
    );
  }

  const words = text.split(" ");

  return (
    <Tag ref={ref as never} className={className}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block overflow-hidden pb-[0.08em] align-bottom"
        >
          <span data-word className={wordClass}>
            {word}
            {index < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
