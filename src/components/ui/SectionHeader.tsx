"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`section-title max-w-2xl ${alignClass}`}
    >
      <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-light-blue px-4 py-1.5 text-sm font-semibold text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        {label}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
      {description && <p className="mt-4 text-lg text-muted">{description}</p>}
    </motion.div>
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
