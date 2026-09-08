"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reset scroll immediately on every route change
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Blur any focused element (e.g. chat widget) that can pull scroll to the footer
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, [pathname]);

  return null;
}
