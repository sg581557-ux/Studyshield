import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Target, Heart, Users, Lightbulb } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { ContactCTA } from "../components/sections/ContactCTA";

const VALUES = [
  { icon: Target, title: "Outcomes over output", desc: "We measure success by your rank, not by hours logged. Every feature exists to move you closer to your target." },
  { icon: Heart, title: "Student-first always", desc: "Product, features, and UX decisions start with one question: does this help a student who's struggling?" },
  { icon: Users, title: "Accessible to all", desc: "Free tier that's genuinely useful. No paywalls on basics. Quality prep shouldn't depend on your parents' income." },
  { icon: Lightbulb, title: "Backed by science", desc: "Spaced repetition, active recall, interleaving — we turn cognitive science research into product behavior." },
];

export function About() {
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
                We're building the study tool we wish we had.
              </h1>
              <p className="mt-5 text-lg text-slate-400 leading-relaxed">
                StudyShield started in a Bengaluru hostel room in 2023 when three JEE drop-year students got tired of juggling six apps, four spreadsheets, and one whiteboard to plan their day. We were working hard but not smart — and nothing on the market seemed to get it. So we built StudyShield: one place that plans, tracks, and keeps you focused, powered by AI that actually understands exam prep.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 lg:px-8">
            <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-12">What we believe</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {VALUES.map((v, i) => (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="card p-6 flex gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-accent-600/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0">
                    <v.icon className="w-5.5 h-5.5 text-accent-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white mb-1.5">{v.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{v.desc}</p>
                  </div>
                </motion.div>
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
