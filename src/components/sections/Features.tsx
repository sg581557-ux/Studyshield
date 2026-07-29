import { motion } from "framer-motion";
import {
  Sparkles, Target, Timer, TrendingUp, BookOpen, Bell, Layers, LineChart,
} from "lucide-react";
import { FEATURES } from "../../lib/constants";

const ICONS: Record<string, React.ElementType> = {
  Sparkles, Target, Timer, TrendingUp, BookOpen, Bell, Layers, LineChart,
};

export function Features() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="max-w-2xl mb-14">
          <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">Features</span>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Everything you need to crack it.
          </h2>
          <p className="mt-4 text-slate-400 text-lg">
            One platform that plans, tracks, and keeps you honest. No more spreadsheets, sticky notes, or guilt about what you forgot to revise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = ICONS[f.icon] || Sparkles;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="card p-6 group hover:border-accent-500/30 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-accent-600/10 border border-accent-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5.5 h-5.5 text-accent-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
