"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverLift?: boolean;
}

export function GlowCard({ children, className = "", delay = 0, hoverLift = true }: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={hoverLift ? { y: -6 } : undefined}
      className={`group gradient-border card-shadow rounded-2xl bg-white p-6 transition-shadow hover:card-shadow-hover md:p-8 ${className}`}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
