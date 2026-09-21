"use client";

import { ServiceVisual } from "@/components/ServiceVisual";
import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import {
  BookOpen,
  Cloud,
  Globe,
  Landmark,
  RefreshCw,
  UserCheck,
  Wallet,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Landmark,
  UserCheck,
  BookOpen,
  Wallet,
  RefreshCw,
  Globe,
};

interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
  image: string;
  slug: string;
  index: number;
}

export function ServiceCard({ title, description, icon, image, slug, index }: ServiceCardProps) {
  const Icon = ICON_MAP[icon] || Cloud;
  const isEven = index % 2 === 0;

  return (
    <div id={slug} className="scroll-mt-28">
      <GlowCard delay={index * 0.05} className="!p-0 overflow-hidden">
      <div className="grid items-stretch md:grid-cols-2">
        <div className={`p-8 md:p-10 ${!isEven ? "md:order-2" : ""}`}>
          <span className="mb-4 inline-block rounded-full bg-light-blue px-3 py-1 text-xs font-bold text-primary">
            Service {String(index + 1).padStart(2, "0")}
          </span>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-light-blue">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <p className="mt-4 leading-relaxed text-muted">{description}</p>
          <Button
            variant="outline"
            size="sm"
            href={`/our-services#${slug}`}
            className="mt-6"
          >
            Learn More
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className={!isEven ? "md:order-1" : ""}>
          <ServiceVisual icon={icon} image={image} title={title} />
        </div>
      </div>
      </GlowCard>
    </div>
  );
}
