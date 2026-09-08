"use client";

import Image from "next/image";
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

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Landmark,
  UserCheck,
  BookOpen,
  Wallet,
  RefreshCw,
  Globe,
};

interface ServiceVisualProps {
  icon: string;
  image: string;
  title: string;
}

export function ServiceVisual({ icon, image, title }: ServiceVisualProps) {
  const Icon = ICON_MAP[icon] || Cloud;

  return (
    <div className="relative h-56 md:h-full md:min-h-[280px]">
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-slate-900/10 to-transparent" />
      <div className="absolute bottom-5 left-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 shadow-lg backdrop-blur">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-white drop-shadow">{title}</p>
      </div>
    </div>
  );
}
