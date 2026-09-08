"use client";

import { FadeIn } from "@/components/ui/FadeIn";
import { CONTACT_INFO } from "@/lib/constants";
import { motion } from "framer-motion";
import { Clock, Headphones, MapPin, Rocket } from "lucide-react";

const QUICK_CARDS = [
  {
    icon: Clock,
    title: "< 24hr Response",
    description: "Our team responds to all inquiries within one business day.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Headphones,
    title: "24×7 Support",
    description: "Enterprise clients get round-the-clock dedicated support.",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Rocket,
    title: "Fast Onboarding",
    description: "Go live with escrow APIs in days with our sandbox environment.",
    color: "from-sky-500 to-blue-500",
  },
];

export function ContactHighlights() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_CARDS.map((card, i) => (
          <FadeIn key={card.title} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -4, scale: 1.02 }}
              className="card-shadow rounded-2xl border border-slate-100 bg-white p-5"
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} text-white`}>
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-foreground">{card.title}</h3>
              <p className="mt-1 text-xs text-muted">{card.description}</p>
            </motion.div>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={0.3}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-light-blue/50 p-6">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-foreground">Bengaluru HQ</p>
              <p className="mt-1 text-sm text-muted">{CONTACT_INFO.company}</p>
              <p className="text-sm text-muted">{CONTACT_INFO.address}</p>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
