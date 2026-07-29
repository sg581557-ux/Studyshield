import { motion } from "framer-motion";
import { HOW_IT_WORKS } from "../../lib/constants";

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">How it works</span>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold text-white tracking-tight">
            From signup to top rank in four steps.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative"
            >
              <div className="text-5xl font-bold gradient-accent mb-4">{s.step}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{s.description}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden lg:block absolute top-6 -right-3 text-2xl text-slate-700">→</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
