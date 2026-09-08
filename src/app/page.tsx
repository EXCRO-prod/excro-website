import { SiteShell } from "@/components/layout/SiteShell";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ServicesPreview } from "@/components/ServicesPreview";
import { TestimonialsStrip } from "@/components/TestimonialsStrip";
import { TrustBar } from "@/components/TrustBar";
import { WhatIsEscrow } from "@/components/WhatIsEscrow";
import { WhyExcro } from "@/components/WhyExcro";

export default function Home() {
  return (
    <SiteShell>
      <Hero />
      <TrustBar />
      <HowItWorks />
      <WhatIsEscrow />
      <WhyExcro />
      <ServicesPreview />
      <TestimonialsStrip />
      <FAQ />
      <FinalCTA />
    </SiteShell>
  );
}
