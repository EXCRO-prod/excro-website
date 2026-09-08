import { ChatWidget } from "@/components/ChatWidget";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ScrollToTop } from "@/components/layout/ScrollToTop";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <div id="page-top" aria-hidden="true" />
        {children}
      </main>
      <Footer />
      <ChatWidget />
    </>
  );
}
