import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";

export function CTA() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl glass-strong border border-white/10 p-10 lg:p-16 text-center"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-accent-600/20 blur-[120px] pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
              Your rank isn't decided yet.
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Join 42,000+ students who stopped guessing and started tracking. It takes 30 seconds to set up.
            </p>
            <Link to="/signup" className="inline-block mt-8">
              <Button size="lg" className="group">
                Get started free
                <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
