"use client";

import { SERVICE_NAV_ITEMS } from "@/lib/constants";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Cloud,
  Globe,
  Landmark,
  RefreshCw,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
  Cloud,
  Landmark,
  UserCheck,
  BookOpen,
  Wallet,
  RefreshCw,
  Globe,
};

interface ServicesDropdownProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function ServicesDropdown({ variant = "desktop", onNavigate }: ServicesDropdownProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = pathname.startsWith("/our-services");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (variant !== "desktop") return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [variant]);

  const handleLinkClick = () => {
    setOpen(false);
    onNavigate?.();
  };

  if (variant === "mobile") {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Link
            href="/our-services"
            scroll={true}
            onClick={handleLinkClick}
            className={`text-base font-medium ${isActive ? "text-primary" : "text-muted"}`}
          >
            Our Services
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-lg p-1 text-muted hover:text-primary"
            aria-expanded={open}
            aria-label="Toggle services menu"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1 border-l-2 border-light-blue pl-4">
                <Link
                  href="/our-services"
                  scroll={true}
                  onClick={handleLinkClick}
                  className="block py-2 text-sm font-semibold text-primary"
                >
                  All Services
                </Link>
                {SERVICE_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    scroll={true}
                    onClick={handleLinkClick}
                    className="block py-2 text-sm text-muted hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="inline-flex items-center gap-0.5">
        <Link
          href="/our-services"
          scroll={true}
          onClick={handleLinkClick}
          className={`text-sm font-medium transition-colors ${
            isActive ? "text-primary" : "text-muted hover:text-primary"
          }`}
        >
          Our Services
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`rounded-md p-0.5 transition-colors ${
            isActive ? "text-primary" : "text-muted hover:text-primary"
          }`}
          aria-expanded={open}
          aria-label="Toggle services menu"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-full z-50 mt-3 w-[520px] -translate-x-1/2"
          >
            <div className="card-shadow overflow-hidden rounded-2xl border border-slate-100 bg-white p-2">
              <div className="grid grid-cols-2 gap-1 p-2">
                {SERVICE_NAV_ITEMS.map((item) => {
                  const Icon = ICON_MAP[item.icon] || Cloud;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      scroll={true}
                      onClick={handleLinkClick}
                      className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-light-blue/60"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-light-blue transition-colors group-hover:bg-primary">
                        <Icon className="h-5 w-5 text-primary transition-colors group-hover:text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                          {item.label}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 p-2">
                <Link
                  href="/our-services"
                  scroll={true}
                  onClick={handleLinkClick}
                  className="flex items-center justify-between rounded-xl bg-light-blue/50 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-light-blue"
                >
                  View All Services
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
