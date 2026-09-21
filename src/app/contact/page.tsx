import { SiteShell } from "@/components/layout/SiteShell";
import { ContactForm } from "@/components/ContactForm";
import { ContactHighlights } from "@/components/ContactHighlights";
import { FadeIn } from "@/components/ui/FadeIn";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACT_INFO } from "@/lib/constants";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with EXCRO for escrow services, API integration, partnerships, and support.",
};

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHeader
        title="Contact Us"
        description="Reach out to our team for sales, support, or partnership inquiries."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        pills={["< 24hr response", "24×7 support", "Free consultation"]}
      />

      <section className="section-padding section-surface">
        <div className="container-max">
          <ContactHighlights />

          <div className="mt-12 grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <FadeIn>
                <h2 className="mb-8 text-2xl font-bold text-foreground">Get in Touch</h2>
                <div className="space-y-6">
                  <div className="card-shadow flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:card-shadow-hover">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-light-blue">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Our Location</p>
                      <p className="mt-1 text-sm text-muted">{CONTACT_INFO.company}</p>
                      <p className="text-sm text-muted">{CONTACT_INFO.address}</p>
                    </div>
                  </div>

                  <div className="card-shadow flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:card-shadow-hover">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-light-blue">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Call Us</p>
                      <a href={`tel:${CONTACT_INFO.phone}`} className="text-sm text-primary hover:underline">
                        {CONTACT_INFO.phone}
                      </a>
                    </div>
                  </div>

                  <div className="card-shadow flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 transition-shadow hover:card-shadow-hover">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-light-blue">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Email Us</p>
                      <div className="mt-1 space-y-1 text-sm">
                        <p>
                          <span className="text-muted">Sales:</span>{" "}
                          <a href={`mailto:${CONTACT_INFO.sales}`} className="text-primary hover:underline">
                            {CONTACT_INFO.sales}
                          </a>
                        </p>
                        <p>
                          <span className="text-muted">Support:</span>{" "}
                          <a href={`mailto:${CONTACT_INFO.support}`} className="text-primary hover:underline">
                            {CONTACT_INFO.support}
                          </a>
                        </p>
                        <p>
                          <span className="text-muted">Partnerships:</span>{" "}
                          <a href={`mailto:${CONTACT_INFO.partnerships}`} className="text-primary hover:underline">
                            {CONTACT_INFO.partnerships}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            <div className="lg:col-span-3">
              <FadeIn delay={0.1}>
                <ContactForm />
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
