"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, ChevronDown, Landmark, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const BLOG_NAV_ITEMS: Array<{
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    label: "API Powered Escrow",
    href: "/api-powered-escrow",
    description: "Programmable escrow workflows for secure, conditional releases.",
    icon: Landmark,
  },
  {
    label: "RERA Accounts",
    href: "/rera-accounts",
    description: "Digital controls for project collections, certifications, and compliance.",
    icon: Building2,
  },
  {
    label: "Treasury & Cash Management",
    href: "/treasury-cash-management",
    description: "Real-time visibility, reconciliation, and controlled disbursements.",
    icon: Wallet,
  },
];

interface BlogDropdownProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function BlogDropdown({ variant = "desktop", onNavigate }: BlogDropdownProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = pathname.startsWith("/blog") || pathname.startsWith("/api-powered-escrow");

  useEffect(() => {
    if (variant !== "desktop") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
            href="/blog"
            scroll={true}
            onClick={handleLinkClick}
            className={`text-base font-medium ${isActive ? "text-primary" : "text-muted"}`}
          >
            Blog
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="rounded-lg p-1 text-muted hover:text-primary"
            aria-expanded={open}
            aria-label="Toggle blog menu"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
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
                  href="/blog"
                  scroll={true}
                  onClick={handleLinkClick}
                  className="block py-2 text-sm font-semibold text-primary"
                >
                  All Insights
                </Link>
                {BLOG_NAV_ITEMS.map((item) => (
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
          href="/blog"
          scroll={true}
          onClick={handleLinkClick}
          className={`text-sm font-medium transition-colors ${
            isActive ? "text-primary" : "text-muted hover:text-primary"
          }`}
        >
          Blog
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`rounded-md p-0.5 transition-colors ${
            isActive ? "text-primary" : "text-muted hover:text-primary"
          }`}
          aria-expanded={open}
          aria-label="Toggle blog menu"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-full z-50 mt-3 w-[420px] -translate-x-1/2"
          >
            <div className="card-shadow overflow-hidden rounded-2xl border border-slate-100 bg-white p-2">
              <div className="space-y-1 p-2">
                {BLOG_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
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
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 p-2">
                <Link
                  href="/blog"
                  scroll={true}
                  onClick={handleLinkClick}
                  className="flex items-center justify-between rounded-xl bg-light-blue/50 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-light-blue"
                >
                  View All Insights
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
