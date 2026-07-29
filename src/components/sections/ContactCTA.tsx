import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin, MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";
import { APP } from "../../lib/constants";

export function ContactCTA() {
  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl glass-strong border border-white/10 p-10 lg:p-16"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-accent-600/20 blur-[120px] pointer-events-none" />
          <div className="relative text-center">
            <h2 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
              Your rank isn't decided yet.
            </h2>
            <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
              Stop guessing and start tracking. It takes 30 seconds to set up.
            </p>
            <Link to="/signup" className="inline-block mt-8">
              <Button size="lg" className="group">
                Get started free
                <ArrowRight className="w-4.5 h-4.5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <div className="mt-12 grid sm:grid-cols-3 gap-6 pt-8 border-t border-white/5">
              {[
                { icon: Mail, label: "Email us", value: APP.email },
                { icon: MapPin, label: "Based in", value: "Bengaluru, India" },
                { icon: MessageSquare, label: "Response", value: "Within 24 hours" },
              ].map((c) => (
                <div key={c.label} className="flex flex-col items-center">
                  <c.icon className="w-5 h-5 text-accent-400 mb-2" />
                  <div className="text-xs text-slate-500">{c.label}</div>
                  <div className="text-sm text-slate-200 font-medium mt-0.5">{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
