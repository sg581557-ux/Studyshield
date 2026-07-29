import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { Button } from "../ui/Button";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-accent-600/20 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass border border-white/10 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            <span className="text-xs font-medium text-slate-300">AI exam prep, reimagined for 2026</span>
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Study smarter.
            <br />
            <span className="gradient-accent">Rank higher.</span>
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            StudyShield builds your daily study plan with AI, tracks every chapter, keeps you focused, and shows exactly where your rank is heading — for JEE, NEET, UPSC, CAT, CA, GATE and more.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup">
              <Button size="lg" className="group">
                Start free — no card needed
                <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="lg">
                <Play className="w-4.5 h-4.5 mr-2" />
                See how it works
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
