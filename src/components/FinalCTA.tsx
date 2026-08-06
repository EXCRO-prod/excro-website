"use client";

import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { ArrowRight, FileText, MessageCircle } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <FadeIn>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center md:px-16 md:py-24">
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
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
                  href="#audit"
                  className="bg-white text-primary hover:bg-blue-50"
                >
                  Book Demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  href="#developers"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  <FileText className="h-4 w-4" />
                  Request API Documentation
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  href="#audit"
                  className="text-white hover:bg-white/10"
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
