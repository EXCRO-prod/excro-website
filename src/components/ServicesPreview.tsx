"use client";

import { Button } from "@/components/ui/Button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SERVICES_DETAILED } from "@/lib/constants";
import {
  BookOpen,
  Cloud,
  Globe,
  Landmark,
  RefreshCw,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Landmark,
  UserCheck,
  BookOpen,
  Wallet,
  RefreshCw,
  Globe,
};

export function ServicesPreview() {
  const preview = SERVICES_DETAILED.slice(0, 3);

  return (
    <section className="section-padding">
      <div className="container-max">
        <SectionHeader
          label="Our Services"
          title="Company chain expertise"
          description="End-to-end escrow infrastructure for banks, enterprises, and platforms."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {preview.map((service, i) => {
            const Icon = ICON_MAP[service.icon] || Cloud;
            return (
              <GlowCard key={service.title} delay={i * 0.1} className="!p-0 overflow-hidden">
                <div className="relative h-44">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 shadow">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="mb-2 font-bold text-foreground">{service.title}</h3>
                  <p className="text-sm leading-relaxed text-muted line-clamp-4">
                    {service.description}
                  </p>
                </div>
              </GlowCard>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Button variant="outline" size="lg" href="/our-services">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
}
