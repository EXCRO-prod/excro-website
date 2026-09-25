"use client";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BlogDropdown } from "@/components/BlogDropdown";
import { Logo } from "@/components/ui/Logo";
import { ServicesDropdown } from "@/components/ServicesDropdown";
import { motion } from "framer-motion";
import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

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

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-sm py-3" : "bg-white/80 py-5"
      }`}
    >
      <div className="container-max flex items-center justify-between px-6 md:px-12 lg:px-4">
        <Link href="/" scroll={true} className="flex items-center gap-2">
          <Image src="/logo.svg" alt="EXCRO" width={170} height={170} />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          <Link
            href="/"
            scroll={true}
            className={`text-sm font-medium transition-colors ${
              isActive("/") ? "text-primary" : "text-muted hover:text-primary"
            }`}
          >
            Home
          </Link>
          <Link
            href="/about"
            scroll={true}
            className={`text-sm font-medium transition-colors ${
              isActive("/about") ? "text-primary" : "text-muted hover:text-primary"
            }`}
          >
            About
          </Link>
          <ServicesDropdown />
          <BlogDropdown />
          <Link
            href="/contact"
            scroll={true}
            className={`text-sm font-medium transition-colors ${
              isActive("/contact") ? "text-primary" : "text-muted hover:text-primary"
            }`}
          >
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-light-blue/50"
          >
            <LogIn size={16} />
            Excro Login
          </Link>
          {/* <Button variant="ghost" size="sm" href="/contact">
            Talk to an Expert
          </Button> */}
          <Button variant="primary" size="sm" href="/contact">
            Book a Demo
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-foreground lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass border-t border-slate-100 px-6 py-6 lg:hidden"
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
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-light-blue px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-blue-100"
              >
                <LogIn size={16} />
                Excro Login
              </Link>
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
