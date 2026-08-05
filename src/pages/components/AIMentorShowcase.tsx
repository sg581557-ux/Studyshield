import { motion } from "framer-motion";
import {
  Brain, Sparkles, Bot, Languages, TrendingUp, CheckCircle2,
} from "lucide-react";

// Static chat mockup for the landing page "AI Mentor" showcase.
export default function AIMentorShowcase() {
  return (
    <section id="mentor" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6 order-2 lg:order-1"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white">
            <Brain className="w-6 h-6" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Your personal <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">AI Mentor</span>
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed max-w-lg">
            A mentor that knows your syllabus, your backlog and your schedule. Ask anything in
            English, Hindi or Hinglish — it plans your day, quizzes you on weak topics and keeps
            you accountable, 24×7.
          </p>
          <ul className="space-y-3">
            {[
              { icon: <Sparkles className="w-4 h-4 text-purple-400" />, text: "Answers in the language you speak" },
              { icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, text: "Tracks your progress and reminds you of backlogs" },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-300">
                {f.icon}
                <span className="text-sm">{f.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="order-1 lg:order-2"
        >
          <div className="relative mx-auto max-w-md">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-[#080808]/95 p-5 shadow-[0_0_80px_rgba(99,102,241,0.15)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">StudyShield Mentor</p>
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-300 flex items-center gap-1">
                  <Languages className="w-3 h-3" /> Hindi / English / Hinglish
                </span>
              </div>

              <div className="space-y-3">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-gray-200">
                  I'm stuck on Thermodynamics and have 3 pending DPPs. What should I do today?
                </div>
                <div className="max-w-[92%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-blue-600/25 to-purple-600/20 border border-blue-400/20 px-4 py-3 text-sm text-gray-100">
                  <p className="mb-1 font-medium text-blue-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Plan for today
                  </p>
                  <p>
                    Finish <span className="text-white font-medium">1 DPP of Thermodynamics</span> (45 min),
                    then watch the 2 pending lectures. I've moved your revision slot to evening so it fits.
                    टेंशन मत लो — 2 घंटे में पक्का हो जाएगा। 💪
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-500/15 border border-emerald-400/25 px-2 py-1 text-[11px] text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> DPP scheduled 6:00 PM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
