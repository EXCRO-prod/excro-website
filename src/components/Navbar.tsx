"use client";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BlogDropdown } from "@/components/BlogDropdown";
import { ServicesDropdown } from "@/components/ServicesDropdown";
import { resetGlare, trackGlare } from "@/components/ui/glare";
import { motion } from "framer-motion";
import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";

// The glass "lens" that sits behind the active nav item and slides between items on navigation.
function NavLens({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="relative px-3 py-1.5">
      {active && (
        <motion.span
          layoutId="nav-lens"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="liquid-glass absolute inset-0 rounded-full"
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${isActive(href) ? "text-primary" : "text-muted hover:text-primary"}`;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 px-3 transition-all duration-300 md:px-6 ${
        scrolled ? "pt-3" : "pt-5"
      }`}
    >
      <div
        onPointerMove={trackGlare}
        onPointerLeave={resetGlare}
        className={`container-max liquid-glass flex items-center justify-between rounded-full pl-5 pr-2 transition-all duration-300 md:pl-7 ${
          scrolled ? "py-1.5" : "py-2.5"
        }`}
      >
        <Link href="/" scroll={true} className="flex items-center gap-2">
          <Image src="/logo.svg" alt="EXCRO" width={150} height={150} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavLens active={isActive("/")}>
            <Link href="/" scroll={true} className={linkClass("/")}>
              Home
            </Link>
          </NavLens>
          <NavLens active={isActive("/about")}>
            <Link href="/about" scroll={true} className={linkClass("/about")}>
              About
            </Link>
          </NavLens>
          <NavLens active={isActive("/our-services")}>
            <ServicesDropdown />
          </NavLens>
          <NavLens active={isActive("/blog") || isActive("/api-powered-escrow")}>
            <BlogDropdown />
          </NavLens>
          <NavLens active={isActive("/contact")}>
            <Link href="/contact" scroll={true} className={linkClass("/contact")}>
              Contact
            </Link>
          </NavLens>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button variant="outline" size="sm" href="/app">
            <LogIn size={16} />
            Excro Login
          </Button>
          <Button variant="primary" size="sm" href="/contact">
            Book a Demo
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="liquid-glass liquid-glass-hover rounded-full p-2 text-foreground lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="liquid-glass container-max mt-2 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl px-6 py-6 lg:hidden"
        >
          <nav className="flex flex-col gap-4">
            <Link
              href="/"
              scroll={true}
              className={`text-base font-medium ${isActive("/") ? "text-primary" : "text-muted"}`}
            >
              Home
            </Link>
            <Link
              href="/about"
              scroll={true}
              className={`text-base font-medium ${isActive("/about") ? "text-primary" : "text-muted"}`}
            >
              About
            </Link>
            <ServicesDropdown variant="mobile" onNavigate={() => setMobileOpen(false)} />
            <BlogDropdown variant="mobile" onNavigate={() => setMobileOpen(false)} />
            <Link
              href="/contact"
              scroll={true}
              className={`text-base font-medium ${isActive("/contact") ? "text-primary" : "text-muted"}`}
            >
              Contact
            </Link>
            <div className="mt-4 flex flex-col gap-3 [&>*]:w-full [&_a]:w-full">
              <Button variant="secondary" href="/app">
                <LogIn size={16} />
                Excro Login
              </Button>
              <Button variant="outline" href="/contact">
                Talk to an Expert
              </Button>
              <Button variant="primary" href="/contact">
                Book a Demo
              </Button>
            </div>
          </nav>
        </motion.div>
      )}
    </motion.header>
  );
}
