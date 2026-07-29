import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PRICING } from "../../lib/constants";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

export function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const getPrice = (p: typeof PRICING[number]) => {
    if (p.name === "Free") return p.price;
    const num = parseInt(p.price.replace(/[^0-9]/g, ""));
    if (billing === "yearly") {
      const yearly = num * 10; // 2 months free
      return p.price.replace(/[0-9,]+/, String(yearly));
    }
    return p.price;
  };

  return (
    <section className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-sm font-semibold text-accent-400 uppercase tracking-wider">Pricing</span>
          <h2 className="mt-3 text-3xl lg:text-5xl font-bold text-white tracking-tight">
            Simple, honest pricing.
          </h2>
          <p className="mt-4 text-slate-400 text-lg">Start free. Upgrade when you're serious. Cancel anytime.</p>

          <div className="inline-flex items-center gap-1 p-1 mt-8 rounded-xl bg-ink-850 border border-white/5">
            <button
              onClick={() => setBilling("monthly")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", billing === "monthly" ? "bg-accent-600 text-white" : "text-slate-400")}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", billing === "yearly" ? "bg-accent-600 text-white" : "text-slate-400")}
            >
              Yearly
              <span className="ml-1.5 text-[10px] text-success-400">2 months free</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={cn(
                "card p-8 relative flex flex-col",
                p.highlighted && "border-accent-500/40 ring-1 ring-accent-500/20"
              )}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent-600 text-white text-xs font-semibold">
                  Most popular
                </div>
              )}

              <h3 className="text-lg font-semibold text-white">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{p.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{getPrice(p)}</span>
                <span className="text-sm text-slate-500">/{p.period}</span>
              </div>

              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <Check className="w-4.5 h-4.5 text-success-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="mt-8">
                <Button variant={p.highlighted ? "primary" : "outline"} fullWidth>
                  {p.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
