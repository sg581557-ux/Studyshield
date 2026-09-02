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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-white">StudyShield</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/signup" className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-colors">
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
    <footer className="border-t border-white/10 bg-[#020202] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div className="col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">StudyShield</span>
          </Link>
          <p className="text-gray-500 max-w-sm">
            The ultimate AI-powered operating system for competitive exam aspirants.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/#features" className="hover:text-blue-400 transition-colors">Features</Link></li>
            <li><Link to="/#faq" className="hover:text-blue-400 transition-colors">FAQ</Link></li>
            <li><Link to="/login" className="hover:text-blue-400 transition-colors">Login</Link></li>
            <li><Link to="/signup" className="hover:text-blue-400 transition-colors">Sign Up</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-white">Company</h4>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/about" className="hover:text-blue-400 transition-colors">About</Link></li>
            <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
            <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} StudyShield. All rights reserved.
      </div>
    </footer>
  );
}
