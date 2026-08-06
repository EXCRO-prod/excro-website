import { ChatWidget } from "@/components/ChatWidget";
import { EscrowAudit } from "@/components/EscrowAudit";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Industries } from "@/components/Industries";
import { Navbar } from "@/components/Navbar";
import { ProductShowcase } from "@/components/ProductShowcase";
import { Security } from "@/components/Security";
import { Solutions } from "@/components/Solutions";
import { TrustBar } from "@/components/TrustBar";
import { WhyExcro } from "@/components/WhyExcro";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <Industries />
        <Solutions />
        <ProductShowcase />
        <WhyExcro />
        <Security />
        <EscrowAudit />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
