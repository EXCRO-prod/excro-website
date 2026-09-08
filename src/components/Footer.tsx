import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CONTACT_INFO, NAV_LINKS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="section-padding border-t border-slate-100 bg-white">
      <div className="container-max px-6 md:px-12 lg:px-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/" scroll={true} className="mb-4 inline-flex items-center">
              <Logo className="h-9 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed text-muted">
              API-powered escrow infrastructure for secure digital transactions.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Services</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/our-services" className="text-sm text-muted hover:text-primary">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/api-powered-escrow" className="text-sm text-muted hover:text-primary">
                  API Powered Escrow
                </Link>
              </li>
              <li>
                <Link href="/our-services" className="text-sm text-muted hover:text-primary">
                  SaaS Platform
                </Link>
              </li>
              <li>
                <Link href="/our-services" className="text-sm text-muted hover:text-primary">
                  Global Escrows
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Company</h4>
            <ul className="space-y-3">
              {NAV_LINKS.filter((l) => l.label !== "Home").map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li>
                <a href={`mailto:${CONTACT_INFO.sales}`} className="hover:text-primary">
                  {CONTACT_INFO.sales}
                </a>
              </li>
              <li>
                <a href={`tel:${CONTACT_INFO.phone}`} className="hover:text-primary">
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li>Bengaluru, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 md:flex-row">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} EXCRO. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted">
            <Link href="/privacy-policy" className="hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-primary">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
