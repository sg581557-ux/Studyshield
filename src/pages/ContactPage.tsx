import { Link } from "react-router-dom";
import { ArrowRight, Mail, MessageSquare } from "lucide-react";
import { PublicNavbar, PublicFooter } from "../components/public/PublicChrome";

const CHANNELS = [
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Email us",
    desc: "For support, billing or feedback — we reply within 24 hours.",
    action: "support@studyshield.study",
    href: "mailto:support@studyshield.study",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Feature requests",
    desc: "Want something new in StudyShield? Tell us what you'd love to see.",
    action: "Share an idea",
    href: "mailto:ideas@studyshield.study",
  },
];

export default function ContactPage() {
  return (
    <div className="public-site min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <PublicNavbar />
      <main className="pt-40 pb-32 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            We'd love to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">hear from you</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Questions, feedback or ideas — get in touch and we'll get back to you as soon as we can.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {CHANNELS.map((c) => (
            <a
              key={c.title}
              href={c.href}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 hover:bg-white/[0.07] transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform">
                {c.icon}
              </div>
              <h2 className="text-lg font-semibold mb-2">{c.title}</h2>
              <p className="text-gray-400 text-sm mb-4">{c.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-400">
                {c.action} <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </a>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Prefer to dive straight in?</h2>
              <p className="text-gray-400 mb-8">Set up your free study profile in 2 minutes.</p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
              >
                Start Free Today <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
