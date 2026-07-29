import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { TESTIMONIALS } from "../../lib/constants";

export function Testimonials() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">Testimonials</span>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Loved by top rankers.
          </h2>
          <p className="mt-4 text-slate-400 text-lg">
            Real students, real results. Here's what changed for them after switching to StudyShield.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
              className="card p-6 flex flex-col"
            >
              <Quote className="w-8 h-8 text-accent-600/40 mb-4" />
              <p className="text-slate-300 leading-relaxed flex-1">"{t.quote}"</p>

              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-white/5">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white text-sm font-semibold">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-warning-500 text-warning-500" />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
