import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Brain, 
  Clock, 
  BookOpen, 
  BarChart, 
  Target, 
  RefreshCw, 
  ChevronDown,
  CheckCircle,
  Play,
  ArrowRight,
  Shield,
  Menu,
  X,
  Sparkles,
  Flame,
  ListTodo,
  FileQuestion,
  RotateCw,
  Coffee,
  TrendingUp,
  Zap
} from 'lucide-react';

// --- Reusable Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${className}`}>
    {children}
  </div>
);

const GradientText = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 ${className}`}>
    {children}
  </span>
);

// --- Sections ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-white">StudyShield</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#showcase" className="hover:text-white transition-colors">AI Planner</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
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
            <a href="#features" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">Features</a>
            <a href="#showcase" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">AI Planner</a>
            <a href="#faq" onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">FAQ</a>
            <hr className="border-white/10 my-2" />
            <Link to="/login" className="text-gray-300 hover:text-white">Login</Link>
            <Link to="/signup" className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold text-center mt-2">Get Started</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex items-center">
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-500 rounded-full blur-[2px]"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              opacity: Math.random() * 0.5 + 0.2
            }}
            animate={{
              y: [null, Math.random() * -100 - 50],
              opacity: [null, 0]
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
      </div>

      <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            Stop Fighting Distractions. <br/>
            <GradientText>Start Winning Exams.</GradientText>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
            The AI-powered study operating system that plans your day, tracks your progress, manages backlog, and keeps you focused.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link to="/signup" className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2">
              Start Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>

        {/* 3D Dashboard Mockup */}
        <div className="relative h-[520px] hidden md:block perspective-1000">
          <motion.div
            animate={{ y: [-8, 8, -8], rotateX: [0, 2, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute right-0 top-6 w-full max-w-[440px]"
          >
            <GlassCard className="p-5 shadow-[0_0_80px_rgba(37,99,235,0.18)] border-white/15 bg-[#080808]/95">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-medium text-blue-400">AI Planner</p>
                  <h3 className="text-lg font-semibold text-white">Today&apos;s Flow</h3>
                </div>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  Live sync
                </span>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Today&apos;s Tasks</span>
                    <span className="text-xs text-gray-400">3/5 done</span>
                  </div>
                  <div className="space-y-2">
                    {['Physics revision', 'Chemistry formulas', 'Maths practice'].map((task) => (
                      <div key={task} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111]/80 px-3 py-2 text-sm text-gray-300">
                        <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/15 to-purple-500/10 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-blue-300">
                      <Clock className="h-4 w-4" /> Focus Timer
                    </div>
                    <div className="text-3xl font-semibold text-white">25:00</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-purple-300">
                      <Target className="h-4 w-4" /> Progress Ring
                    </div>
                    <div className="text-3xl font-semibold text-white">82%</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            animate={{ y: [10, -10, 10], x: [0, 6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute left-0 top-24 z-30 w-64"
          >
            <GlassCard className="p-4 shadow-[0_0_60px_rgba(168,85,247,0.14)] bg-[#070707]/95">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <BookOpen className="h-4 w-4 text-blue-400" /> Subject Cards
                </div>
                <Sparkles className="h-4 w-4 text-purple-400" />
              </div>
              <div className="space-y-2">
                {['Physics', 'Chemistry', 'Maths'].map((subject, index) => (
                  <div key={subject} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span className="text-gray-300">{subject}</span>
                    <span className={`text-xs ${index === 0 ? 'text-blue-300' : index === 1 ? 'text-purple-300' : 'text-emerald-300'}`}>
                      {index === 0 ? '3 topics' : index === 1 ? '2 topics' : '4 topics'}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="absolute right-10 bottom-8 z-10 w-72"
          >
            <GlassCard className="p-4 bg-[#070707]/95">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Flame className="h-4 w-4 text-orange-400" /> Streak
                </div>
                <span className="text-xs text-gray-400">Consistency</span>
              </div>
              <div className="text-3xl font-semibold text-white">18 days</div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            animate={{ y: [4, -10, 4] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2.2 }}
            className="absolute left-20 bottom-0 z-0 w-60"
          >
            <GlassCard className="p-4 bg-[#090909]/95">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                <ListTodo className="h-4 w-4 text-blue-400" /> Backlog Tracker
              </div>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span>Thermodynamics</span>
                  <span className="text-amber-300">75%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span>Organic chem</span>
                  <span className="text-emerald-300">52%</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    { icon: <Brain />, title: "AI Planner", desc: "Automatically creates your daily study plan." },
    { icon: <RefreshCw />, title: "Backlog Tracker", desc: "Never lose track of unfinished chapters." },
    { icon: <BookOpen />, title: "Formula Vault", desc: "Search formulas instantly." },
    { icon: <BarChart />, title: "Smart Analytics", desc: "Visual charts of your performance." },
    { icon: <Clock />, title: "Focus Mode", desc: "Pomodoro timer with distraction-free study." },
    { icon: <Target />, title: "Adaptive Revision", desc: "Schedules revision automatically." }
  ];

  return (
    <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to <GradientText>succeed</GradientText></h2>
        <p className="text-gray-400 max-w-2xl mx-auto">A complete ecosystem designed to optimize your study workflow and eliminate friction.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <GlassCard className="p-8 h-full group hover:border-white/20 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-400">{f.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { title: "Tell us your syllabus", desc: "Select your target exam and subjects." },
    { title: "AI analyzes backlog", desc: "We identify your weak areas and pending topics." },
    { title: "Daily personalized plan", desc: "Get a customized schedule every single morning." },
    { title: "Track progress until exam", desc: "Watch your completion rate hit 100%." }
  ];

  return (
    <section className="py-32 bg-white/[0.02] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-20">How It <GradientText>Works</GradientText></h2>
        
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-500/50 via-purple-500/50 to-transparent" />
          
          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.2 }}
                className="relative pl-16"
              >
                <div className="absolute left-0 top-1 w-14 h-14 rounded-full bg-[#050505] border-2 border-purple-500 flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                  {i + 1}
                </div>
                <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-400 text-lg">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const Showcase = () => {
  const [activeView, setActiveView] = useState<'plan' | 'generate'>('plan');
  const [activeMode, setActiveMode] = useState('balanced');
  const [hours, setHours] = useState(6);
  const [goal, setGoal] = useState('Complete 3 Lectures');

  const planTasks = [
    { time: '09:00', title: 'Rotational Motion — Lecture 4', subject: 'Physics', type: 'study', priority: 'high', duration: '1h 30m', done: true },
    { time: '10:45', title: 'Organic Chem — Practice set', subject: 'Chemistry', type: 'practice', priority: 'medium', duration: '1h', done: true },
    { time: '12:00', title: 'Break', subject: '', type: 'break', priority: '', duration: '15m', done: false },
    { time: '12:15', title: 'Calculus — Revision', subject: 'Maths', type: 'revision', priority: 'high', duration: '45m', done: false },
    { time: '14:00', title: 'Full Mock Test — Physics', subject: 'Physics', type: 'test', priority: 'high', duration: '2h', done: false },
  ];

  const typeMeta: Record<string, { icon: React.ElementType; color: string; ring: string }> = {
    study: { icon: BookOpen, color: 'text-blue-300', ring: 'from-blue-500 to-blue-400' },
    practice: { icon: FileQuestion, color: 'text-amber-300', ring: 'from-amber-500 to-amber-400' },
    revision: { icon: RotateCw, color: 'text-emerald-300', ring: 'from-emerald-500 to-emerald-400' },
    break: { icon: Coffee, color: 'text-slate-400', ring: 'from-slate-500 to-slate-400' },
    test: { icon: TrendingUp, color: 'text-rose-300', ring: 'from-rose-500 to-rose-400' },
  };

  const modes = [
    { id: 'balanced', label: 'Balanced', desc: 'Steady pace', icon: CheckCircle },
    { id: 'hard_push', label: 'Hard Push', desc: 'Intense focus', icon: Zap },
    { id: 'recovery', label: 'Recovery', desc: 'Lighter load', icon: Clock },
    { id: 'exam_sprint', label: 'Exam Sprint', desc: 'Max practice', icon: Target },
  ];

  const goalSuggestions = ['Complete 3 Lectures', 'Finish 2 Chapters', 'Solve 50 Qs', 'Revise weak chapters'];

  const completed = planTasks.filter((t) => t.done && t.type !== 'break').length;
  const total = planTasks.filter((t) => t.type !== 'break').length;
  const pct = Math.round((completed / total) * 100);
  const R = 26;
  const C = 2 * Math.PI * R;

  const features = [
    { icon: Sparkles, title: 'AI-generated', desc: 'Plans built from your syllabus, backlog & available hours.' },
    { icon: Target, title: 'Priority-aware', desc: 'High-stakes topics surface first, every single day.' },
    { icon: RefreshCw, title: 'Auto-revision', desc: 'Spaced repetition baked into your daily timeline.' },
  ];

  return (
    <section id="showcase" className="py-32 px-6 max-w-7xl mx-auto overflow-hidden">
      <div className="text-center mb-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-blue-300 mb-5">
          <Sparkles className="w-3.5 h-3.5" /> AI Planner
        </span>
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Your day, <GradientText>planned in seconds</GradientText></h2>
        <p className="text-gray-400 max-w-2xl mx-auto">A command center that turns your syllabus, backlog and available hours into a focused daily timeline.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.15 }}
            >
              <GlassCard className="p-5 flex items-start gap-4 hover:border-white/20 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-300 flex-shrink-0">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-8 order-1 lg:order-2">
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-transparent blur-3xl" />
            <GlassCard className="relative overflow-hidden border-white/15 bg-[#080808]/95 p-2 sm:p-3 shadow-[0_0_90px_rgba(37,99,235,0.16)]">
              <div className="rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_40%),linear-gradient(135deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-blue-300">AI planner studio</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">The calmest study command center</h3>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Adaptive plan running
                  </div>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-[#0f0f10]/90 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">Today’s plan</p>
                          <p className="mt-1 text-xs text-gray-500">Balanced pace • 6.5 hours</p>
                        </div>
                        <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                          82% on track
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Focus block</p>
                          <p className="mt-1 text-2xl font-semibold text-white">3h 20m</p>
                        </div>
                        <div className="relative h-16 w-16">
                          <svg viewBox="0 0 100 100" className="h-16 w-16 -rotate-90">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="url(#plannerRing)" strokeWidth="8" strokeDasharray="264" strokeDashoffset="44" strokeLinecap="round" />
                            <defs>
                              <linearGradient id="plannerRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38b1ff" />
                                <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: 'Physics', value: 'Rotational Motion', tint: 'from-blue-500/20 to-blue-400/5' },
                        { label: 'Chemistry', value: 'Organic Reactions', tint: 'from-purple-500/20 to-purple-400/5' },
                        { label: 'Maths', value: 'Calculus Practice', tint: 'from-emerald-500/20 to-emerald-400/5' },
                        { label: 'Revision', value: 'Weak topics', tint: 'from-amber-500/20 to-amber-400/5' },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.tint} p-3`}>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">{item.label}</p>
                          <p className="mt-1 text-sm font-medium text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-[#101012]/95 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Priority queue</p>
                        <p className="text-xs text-gray-500">Auto-sorted by urgency</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300">
                        Live
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        ['Complete mock test', 'Physics', '2h', 'high'],
                        ['Revise formulas', 'Chemistry', '45m', 'medium'],
                        ['Practice calculus', 'Maths', '1h', 'high'],
                      ].map(([title, subject, duration, priority]) => (
                        <div key={title} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                          <div>
                            <p className="text-sm text-white">{title}</p>
                            <p className="text-xs text-gray-500">{subject}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400">{duration}</p>
                            <p className={`text-[10px] font-medium ${priority === 'high' ? 'text-rose-300' : 'text-amber-300'}`}>{priority}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-4 -top-4 hidden lg:block">
              <GlassCard className="p-3.5 w-44 shadow-2xl shadow-purple-500/20 bg-[#111]">
                <div className="text-[10px] font-bold text-purple-300 mb-1">COMPLETED THIS WEEK</div>
                <div className="text-2xl font-bold text-white">24 <span className="text-xs text-gray-500 font-normal">tasks</span></div>
              </GlassCard>
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute -left-4 bottom-10 hidden lg:block">
              <GlassCard className="p-3.5 w-44 shadow-2xl shadow-blue-500/20 bg-[#111]">
                <div className="text-[10px] font-bold text-blue-300 mb-1">TODAY'S FOCUS</div>
                <div className="text-2xl font-bold text-white">5h 30m</div>
                <div className="text-xs text-gray-400">of 6h goal</div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Stats = () => (
  <section className="py-20 bg-white/[0.02] border-y border-white/5">
    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
      <div>
        <div className="text-5xl font-bold mb-2"><GradientText>95%</GradientText></div>
        <div className="text-gray-400 font-medium">Students feel more organized</div>
      </div>
      <div>
        <div className="text-5xl font-bold mb-2"><GradientText>4x</GradientText></div>
        <div className="text-gray-400 font-medium">Better consistency</div>
      </div>
      <div>
        <div className="text-5xl font-bold mb-2"><GradientText>500+</GradientText></div>
        <div className="text-gray-400 font-medium">Hours saved per year</div>
      </div>
    </div>
  </section>
);

const Testimonials = () => {
  const reviews = [
    { name: "Rahul S.", exam: "JEE Aspirant", text: "The AI Planner completely changed how I manage my backlog. I no longer waste 2 hours a day just figuring out what to study." },
    { name: "Priya M.", exam: "NEET Aspirant", text: "Focus mode is a lifesaver. Combining the Pomodoro timer with strict tracking finally got my consistency up." },
    { name: "Aman K.", exam: "JEE Aspirant", text: "StudyShield feels like a premium tool built by someone who actually gave these exams. The UI is gorgeous and fast." }
  ];

  return (
    <section className="py-32 px-6 max-w-7xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">Loved by <GradientText>Top Aspirants</GradientText></h2>
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => (
          <GlassCard key={i} className="p-8">
            <div className="flex gap-1 text-yellow-500 mb-4">
              {[...Array(5)].map((_, i) => <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
            </div>
            <p className="text-gray-300 mb-6 text-lg">"{r.text}"</p>
            <div>
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-gray-500">{r.exam}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    { q: "Is StudyShield only for JEE and NEET?", a: "While currently optimized for JEE and NEET syllabi, the core study planner and focus tools can be used by any competitive exam student." },
    { q: "How does the AI Planner work?", a: "It uses your selected syllabus, pending backlog, and daily available hours to generate a mathematically optimized schedule that ensures maximum coverage before D-day." },
    { q: "Can I use it on mobile?", a: "Yes, StudyShield is fully responsive and functions as a progressive web app (PWA) on all mobile devices." },
    { q: "Is the free version really free?", a: "Absolutely. The core planning and tracking features are free forever. Pro is only for advanced analytics and premium vaults." }
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 px-6 max-w-3xl mx-auto">
      <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <GlassCard key={i} className="overflow-hidden">
            <button 
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full p-6 text-left flex justify-between items-center focus:outline-none"
            >
              <span className="font-semibold text-lg">{faq.q}</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === i ? 'rotate-180 text-blue-400' : 'text-gray-500'}`} />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 text-gray-400 leading-relaxed"
                >
                  {faq.a}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        ))}
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="py-32 px-6 max-w-5xl mx-auto text-center">
    <GlassCard className="p-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10" />
      <div className="relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold mb-6">Ready to <GradientText>Study Smarter?</GradientText></h2>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Join thousands of students who have upgraded their study OS and stopped wasting time planning.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/signup" className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-colors">
            Start Free Today
          </Link>
          <Link to="/login" className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-colors">
            Login
          </Link>
        </div>
      </div>
    </GlassCard>
  </section>
);

const Footer = () => (
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
          <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
          <li><a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a></li>
          <li><Link to="/login" className="hover:text-blue-400 transition-colors">Login</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-4 text-white">Legal</h4>
        <ul className="space-y-2 text-sm text-gray-500">
          <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
          <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
          <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
      © {new Date().getFullYear()} StudyShield. All rights reserved.
    </div>
  </footer>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Stats />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
