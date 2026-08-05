import { Link } from "react-router-dom";
import { ArrowRight, Brain, Clock, ShieldCheck, Target } from "lucide-react";
import { PublicNavbar, PublicFooter } from "../components/public/PublicChrome";

const VALUES = [
  { icon: <Brain />, title: "AI-First", desc: "Every feature is designed to remove planning friction so you can spend your energy on studying, not scheduling." },
  { icon: <Target />, title: "Exam-Obsessed", desc: "Built by people who lived JEE, NEET and board prep — optimized for real syllabi, backlogs and D-days." },
  { icon: <Clock />, title: "Consistency Built In", desc: "Streaks, timers and smart revision are engineered to keep you showing up every single day." },
  { icon: <ShieldCheck />, title: "Private by Default", desc: "Your study data belongs to you. We never sell it and never share it without your consent." },
];

export default function AboutPage() {
  return (
    <div className="public-site min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <PublicNavbar />
      <main className="pt-40 pb-32 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Built for <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">aspirants</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            StudyShield is the AI-powered study operating system for competitive exam students. We help you
            plan your day, track every chapter, manage backlog and stay focused — so you can stop fighting
            distractions and start winning exams.
          </p>
        </div>

        <div className="space-y-6 mb-20">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-3">Our Story</h2>
            <p className="text-gray-400 leading-relaxed">
              StudyShield started with a simple observation: serious students don't lack hard work — they lack
              a system. Coaching, school and self-study pile up, backlogs snowball, and hours are lost deciding
              what to study next. We built StudyShield to be that system: a daily AI planner that knows your
              syllabus, your backlog and your schedule, and turns it into a clear, achievable plan every morning.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
            <p className="text-gray-400 leading-relaxed">
              To give every student — regardless of coaching, city or income — access to a world-class planning
              and focus toolkit that maximizes their preparation before the big day.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-20">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-white mb-5">
                {v.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Start your journey today</h2>
              <p className="text-gray-400 mb-8">It takes 2 minutes to set up your study profile.</p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
