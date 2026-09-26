import type { PointerEvent } from "react";

// Moves the .liquid-glass glare (see globals.css) to follow the pointer.
export function trackGlare(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty("--glare-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
  el.style.setProperty("--glare-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

export function resetGlare(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty("--glare-x");
  e.currentTarget.style.removeProperty("--glare-y");
}
