"use client";

import { GlowCard } from "@/components/ui/GlowCard";
import {
  Globe,
  Headphones,
  Shield,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Shield,
  Zap,
  Globe,
  Headphones,
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  delay?: number;
}

export function FeatureCard({ title, description, icon, delay = 0 }: FeatureCardProps) {
  const Icon = ICON_MAP[icon] || Shield;
  return (
    <GlowCard delay={delay}>
      <Icon className="mb-4 h-8 w-8 text-primary" />
      <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </GlowCard>
  );
}
