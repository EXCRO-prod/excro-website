import { NAV_LINKS } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white py-16">
      <div className="container-max px-6 md:px-12 lg:px-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
                E
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">EXCRO</span>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              API-powered escrow infrastructure for secure digital transactions.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Product</h4>
            <ul className="space-y-3">
              {["Digital Escrow", "API Integration", "Settlement Engine", "Reconciliation"].map(
                (item) => (
                  <li key={item}>
                    <a href="#solutions" className="text-sm text-muted hover:text-primary">
                      {item}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Company</h4>
            <ul className="space-y-3">
              {NAV_LINKS.slice(4).map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted hover:text-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Contact</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li>hello@excro.in</li>
              <li>+91 80 1234 5678</li>
              <li>Bengaluru, India</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 md:flex-row">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} EXCRO. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-muted">
            <a href="#" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
