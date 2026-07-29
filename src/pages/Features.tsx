import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Features as FeaturesSection } from "../components/sections/Features";
import { HowItWorks } from "../components/sections/HowItWorks";
import { ContactCTA } from "../components/sections/ContactCTA";
import { Button } from "../components/ui/Button";

const COMPARE = [
  { feature: "AI daily planner", us: true, them: "Manual or basic rules" },
  { feature: "Spaced-revision reminders", us: true, them: "Self-managed" },
  { feature: "Focus Mode with analytics", us: true, them: "Timer only" },
  { feature: "Chapter-level confidence tracking", us: true, them: "Topic-level only" },
  { feature: "Backlog auto-recovery", us: true, them: "No backlog system" },
  { feature: "Mock test weak-chapter AI", us: true, them: "Manual review" },
  { feature: "Works offline", us: true, them: "Requires connection" },
];

export function FeaturesPage() {
  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <main className="pt-32">
        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8">
              <ArrowLeft className="w-4 h-4" /> Back home
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
              <h1 className="text-4xl lg:text-6xl font-bold text-white tracking-tight">
                Features that get you to rank 1.
              </h1>
              <p className="mt-5 text-lg text-slate-400">
                StudyShield replaces your planner, tracker, timer, and revision calendar with one AI-driven system that actually understands how exams work.
              </p>
              <Link to="/signup" className="inline-block mt-8">
                <Button size="lg" className="group">
                  Try it free <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        <FeaturesSection />
        <HowItWorks />

        <section className="py-20 lg:py-28">
          <div className="max-w-4xl mx-auto px-5 lg:px-8">
            <h2 className="text-2xl lg:text-4xl font-bold text-white tracking-tight text-center mb-12">
              How we compare
            </h2>
            <div className="card overflow-hidden">
              <div className="grid grid-cols-3 px-6 py-4 border-b border-white/5 text-sm font-semibold">
                <div className="text-slate-400">Capability</div>
                <div className="text-center text-white">StudyShield</div>
                <div className="text-center text-slate-500">Typical app</div>
              </div>
              {COMPARE.map((row) => (
                <div key={row.feature} className="grid grid-cols-3 px-6 py-4 border-b border-white/5 last:border-0 text-sm">
                  <div className="text-slate-300">{row.feature}</div>
                  <div className="text-center">
                    {row.us === true ? (
                      <Check className="w-5 h-5 text-success-400 mx-auto" />
                    ) : (
                      <span className="text-accent-300 font-semibold">{row.us}</span>
                    )}
                  </div>
                  <div className="text-center text-slate-500">{row.them}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ContactCTA />
      </main>
      <Footer />
    </div>
  );
}
