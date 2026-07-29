import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Pricing as PricingSection } from "../components/sections/Pricing";
import { FAQ } from "../components/sections/FAQ";
import { CTA } from "../components/sections/CTA";

export function PricingPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32">
        <PricingSection />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
