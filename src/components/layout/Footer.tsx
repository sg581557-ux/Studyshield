import { Link } from "react-router-dom";
import { Shield, Twitter, Github, Linkedin, Mail } from "lucide-react";
import { APP, NAV_LINKS, EXAMS } from "../../lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-950">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">{APP.name}</span>
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{APP.description}</p>
            <div className="flex items-center gap-3 mt-6">
              {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-ink-800 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/10 transition-all"
                >
                  <Icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Product</h4>
            <ul className="space-y-3">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-slate-400 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
              <li><Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Exams</h4>
            <ul className="space-y-3">
              {EXAMS.slice(0, 6).map((e) => (
                <li key={e}><span className="text-sm text-slate-400">{e}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Company</h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-sm text-slate-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">© 2026 {APP.name}. All rights reserved.</p>
          <p className="text-sm text-slate-500">Made with care in Bengaluru, India.</p>
        </div>
      </div>
    </footer>
  );
}
