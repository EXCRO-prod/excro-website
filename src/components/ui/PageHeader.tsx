"use client";

import { FloatingOrbs } from "@/components/ui/FloatingOrbs";
import { FeaturePill } from "@/components/ui/SectionHeader";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Shield, Zap } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  pills?: string[];
}

export function PageHeader({ title, description, breadcrumbs, pills }: PageHeaderProps) {
  return (
    <section
      id="page-hero"
      className="page-hero hero-grid relative overflow-hidden border-b border-slate-100"
    >
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <FloatingOrbs />
      </div>
      <div className="container-max relative z-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <motion.nav
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-1 text-sm text-muted"
          >
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-4 w-4" />}
                {crumb.href ? (
                  <Link href={crumb.href} scroll={true} className="hover:text-primary">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </motion.nav>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-2xl text-lg leading-relaxed text-muted"
          >
            {description}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap gap-3"
        >
          {(pills ?? ["Bank-grade security", "API-first", "RBI compliant"]).map((pill) => (
            <FeaturePill
              key={pill}
              icon={pill.includes("security") ? <Shield className="h-4 w-4 text-primary" /> : <Zap className="h-4 w-4 text-primary" />}
            >
              {pill}
            </FeaturePill>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
