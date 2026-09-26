"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { resetGlare, trackGlare } from "@/components/ui/glare";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "inverse" | "whatsapp";
  size?: "sm" | "md" | "lg";
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}

const variants = {
  primary: "liquid-glass liquid-glass-tinted liquid-glass-hover",
  secondary: "liquid-glass liquid-glass-hover text-primary",
  outline: "liquid-glass liquid-glass-hover text-foreground hover:text-primary",
  ghost: "text-muted hover:text-primary hover:bg-light-blue/50",
  inverse: "liquid-glass liquid-glass-inverse liquid-glass-hover",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1ebe57] shadow-lg shadow-[#25D366]/30",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  className = "",
  type = "button",
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");

    if (isExternal) {
      return (
        <motion.a
          href={href}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={classes}
          onPointerMove={trackGlare}
          onPointerLeave={resetGlare}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {children}
        </motion.a>
      );
    }

    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
        <Link href={href} scroll={true} className={classes} onPointerMove={trackGlare} onPointerLeave={resetGlare}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      onPointerMove={trackGlare}
      onPointerLeave={resetGlare}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
