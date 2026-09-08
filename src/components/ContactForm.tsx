"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { CONTACT_SUBJECTS } from "@/lib/constants";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";

interface ContactFormProps {
  showTitle?: boolean;
  compact?: boolean;
}

export function ContactForm({ showTitle = true, compact = false }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-shadow rounded-3xl border border-slate-100 bg-white p-8 text-center md:p-12"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">Message Sent!</h3>
        <p className="mt-2 text-muted">Our team will get back to you within 24 hours.</p>
      </motion.div>
    );
  }

  return (
    <div className="card-shadow rounded-3xl border border-slate-100 bg-white p-8 md:p-10">
      {showTitle && (
        <FadeIn>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Get in Touch</h2>
          <p className="mb-8 text-muted">Tell us about your escrow needs and we&apos;ll reach out shortly.</p>
        </FadeIn>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className={`grid gap-5 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
              Your Name
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
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-foreground">
              Phone Number
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
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Your Email
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
            <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-foreground">
              Your Company
            </label>
            <input
              id="company"
              name="company"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Company name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-foreground">
            Subject
          </label>
          <select
            id="subject"
            name="subject"
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select Services</option>
            {CONTACT_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-foreground">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Describe your requirements..."
          />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
          Get in Touch
        </Button>
      </form>
    </div>
  );
}
