"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Globe,
  Rocket,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  Zap,
  Building2,
  Globe,
};

interface TimelineItem {
  year: string;
  title: string;
  description: string;
  icon: string;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-primary via-accent to-transparent md:block" />
      <div className="space-y-8">
        {items.map((item, i) => {
          const Icon = ICON_MAP[item.icon] || Rocket;
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex gap-6 md:pl-16"
            >
              <div className="absolute left-4 hidden h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-primary shadow-md md:block" />
              <div className="card-shadow flex-1 rounded-2xl border border-slate-100 bg-white p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-light-blue">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full bg-light-blue px-3 py-1 text-xs font-bold text-primary">
                    {item.year}
                  </span>
                </div>
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
