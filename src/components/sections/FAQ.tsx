import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { FAQS } from "../../lib/constants";
import { cn } from "../../lib/utils";

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-3xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">FAQ</span>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Questions, answered.
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-semibold text-white">{item.q}</span>
                  <Plus className={cn("w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300", isOpen && "rotate-45 text-accent-400")} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
