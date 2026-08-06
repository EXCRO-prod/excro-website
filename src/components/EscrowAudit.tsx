"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { AUDIT_BENEFITS } from "@/lib/constants";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

export function EscrowAudit() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="audit" className="section-padding bg-gradient-to-b from-light-blue/50 to-white">
      <div className="container-max">
        <FadeIn>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Free Escrow Audit
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
              Get a Free Escrow Workflow Audit
            </h2>
            <p className="mt-4 text-lg text-muted">
              Our experts will review your payment workflows and show you how EXCRO can help.
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-12 lg:grid-cols-5">
          <FadeIn delay={0.1} className="lg:col-span-3">
            <motion.div
              layout
              className="card-shadow rounded-3xl border border-slate-100 bg-white p-8 md:p-10"
            >
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Request Received!</h3>
                  <p className="mt-2 text-muted">
                    Our team will reach out within 24 hours to schedule your free audit.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                        Name
                      </label>
                      <input
                        id="name"
                        name="name"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-foreground">
                        Company
                      </label>
                      <input
                        id="company"
                        name="company"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="Company name"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
                        Phone
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="volume" className="mb-1.5 block text-sm font-medium text-foreground">
                        Monthly Transaction Volume
                      </label>
                      <select
                        id="volume"
                        name="volume"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select range</option>
                        <option value="under-10L">Under ₹10 Lakhs</option>
                        <option value="10L-1Cr">₹10L — ₹1 Cr</option>
                        <option value="1Cr-10Cr">₹1 Cr — ₹10 Cr</option>
                        <option value="10Cr+">₹10 Cr+</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="industry" className="mb-1.5 block text-sm font-medium text-foreground">
                        Industry
                      </label>
                      <select
                        id="industry"
                        name="industry"
                        required
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">Select industry</option>
                        <option value="marketplace">Marketplace</option>
                        <option value="real-estate">Real Estate</option>
                        <option value="construction">Construction</option>
                        <option value="b2b">B2B Commerce</option>
                        <option value="logistics">Logistics</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Tell us about your escrow needs..."
                    />
                  </div>

                  <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
                    Request Free Audit
                  </Button>
                </form>
              )}
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.2} className="lg:col-span-2">
            <div className="sticky top-32">
              <h3 className="mb-6 text-xl font-bold text-foreground">What you&apos;ll get</h3>
              <ul className="space-y-4">
                {AUDIT_BENEFITS.map((benefit, i) => (
                  <motion.li
                    key={benefit}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                    <span className="text-foreground">{benefit}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl bg-primary p-6 text-white">
                <p className="text-sm font-medium opacity-90">Average response time</p>
                <p className="text-3xl font-bold">&lt; 24 hours</p>
                <p className="mt-2 text-sm opacity-80">
                  Our escrow specialists are ready to help you optimize your payment workflows.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
