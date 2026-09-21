"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type ReactNode } from "react";

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
  primary: "bg-primary text-white hover:bg-secondary shadow-lg shadow-primary/25",
  secondary: "bg-light-blue text-primary hover:bg-blue-100",
  outline: "border border-slate-200 bg-white text-foreground hover:border-primary/30 hover:bg-light-blue/50",
  ghost: "text-muted hover:text-primary hover:bg-light-blue/50",
  inverse: "border border-white/40 bg-white/10 text-white hover:border-white/70 hover:bg-white/20 hover:text-white",
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
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    const isExternal = href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:");

    if (isExternal) {
      return (
        <motion.a
          href={href}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={classes}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {children}
        </motion.a>
      );
    }

    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-flex">
        <Link href={href} scroll={true} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
