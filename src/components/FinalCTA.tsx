"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { motion } from "framer-motion";
import { ArrowRight, FileText, MessageCircle, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="section-padding section-surface">
      <div className="container-max">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:px-16 md:py-24">
            <div className="pointer-events-none absolute inset-0 dot-grid opacity-10" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            />

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20"
              >
                <Sparkles className="h-7 w-7 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                Ready to Secure Your Transactions?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
                Join enterprises that trust EXCRO for secure, scalable escrow infrastructure.
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  className="bg-white text-primary shadow-lg hover:bg-blue-50"
                >
                  Book Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="inverse"
                  size="lg"
                  href="/api-powered-escrow"
                >
                  <FileText className="h-4 w-4" />
                  Learn About API Escrow
                </Button>
                <Button
                  variant="inverse"
                  size="lg"
                  href="/contact"
                >
                  <MessageCircle className="h-4 w-4" />
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
