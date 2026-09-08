"use client";

import { TRUST_LOGOS } from "@/lib/constants";

export function LogoMarquee() {
  const logos = [...TRUST_LOGOS, ...TRUST_LOGOS];

  return (
    <div className="relative overflow-hidden border-y border-slate-100 bg-white py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-16">
        {logos.map((logo, i) => (
          <span
            key={`${logo}-${i}`}
            className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-300 transition-colors hover:text-primary"
          >
            {logo}
          </span>
        ))}
      </div>
    </div>
  );
}
