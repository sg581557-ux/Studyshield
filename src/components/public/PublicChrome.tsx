import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Shield, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Features", to: "/#features" },
  { label: "AI Planner", to: "/#showcase" },
  { label: "AI Mentor", to: "/#mentor" },
  { label: "FAQ", to: "/#faq" },
];

export function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050507]/70 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-[64px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black">
            <Shield className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-[650] tracking-tight text-white">StudyShield</span>
          <span className="hidden rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold tracking-wide text-black sm:inline-flex">JEE • NEET</span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-zinc-400">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-zinc-100 transition-colors">
            Get Started
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-20 left-0 right-0 bg-[#050505] border-b border-white/10 p-6 flex flex-col gap-4"
          >
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
                {item.label}
              </Link>
            ))}
            <hr className="border-white/10 my-2" />
            <Link to="/login" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">Login</Link>
            <Link to="/signup" onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold text-center mt-2">Get Started</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#050507] pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
        <div className="col-span-2">
          <Link to="/" className="flex items-center gap-2.5 mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black">
              <Shield className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-[650] tracking-tight text-white">StudyShield</span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            The study OS for JEE & NEET — plan, backlog, revision, and focus in one place. Built by toppers, for toppers.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Product</h4>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li><Link to="/#features" className="hover:text-white transition-colors">Features</Link></li>
            <li><Link to="/#showcase" className="hover:text-white transition-colors">AI Planner</Link></li>
            <li><Link to="/#mentor" className="hover:text-white transition-colors">AI Mentor</Link></li>
            <li><Link to="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Company</h4>
          <ul className="space-y-2 text-sm text-zinc-500">
            <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/5 px-6 pt-6 text-xs text-zinc-600 sm:flex-row">
        <span>© {new Date().getFullYear()} StudyShield. Built for learners, not shareholders.</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> All systems operational
        </span>
      </div>
    </footer>
  );
}
