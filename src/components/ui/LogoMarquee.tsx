"use client";

import { TRUST_LOGOS } from "@/lib/constants";

const REPEAT_COUNT = 4;

function LogoTrack({ hidden }: { hidden?: boolean }) {
  const items = Array.from({ length: REPEAT_COUNT }, () => TRUST_LOGOS).flat();

  return (
    <div className="flex shrink-0 items-center gap-16 pr-16" aria-hidden={hidden}>
      {items.map((logo, index) => (
        <span
          key={`${logo}-${index}`}
          className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-300 transition-colors hover:text-primary"
        >
          {logo}
        </span>
      ))}
    </div>
  );
}

export function LogoMarquee() {
  return (
    <div className="relative w-full overflow-hidden border-y border-slate-100 bg-white py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />

      <div className="flex w-max animate-marquee will-change-transform">
        <LogoTrack />
        <LogoTrack hidden />
      </div>
    </div>
  );
}
