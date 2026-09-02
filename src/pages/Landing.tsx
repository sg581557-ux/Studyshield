import { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Brain,
  Clock,
  BookOpen,
  BarChart3,
  Target,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Flame,
  ListTodo,
  Shield,
  Beaker,
  Calculator,
  Stethoscope,
  Play,
  Check,
  TrendingUp,
  Users,
  Award,
  Zap,
} from 'lucide-react';
import { PublicNavbar, PublicFooter } from '../components/public/PublicChrome';
import { SEO, DEFAULT_TITLE, DEFAULT_DESCRIPTION, CANONICAL } from '../components/SEO';

const AIPlannerShowcase = lazy(() => import('./components/AIPlannerShowcase'));
const AIMentorShowcase = lazy(() => import('./components/AIMentorShowcase'));

// ——— Hero — redesigned: editorial, warm amber, no generic blue/purple
const Hero = () => {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#050507] pt-20">
      {/* ——— Cinematic canvas ——— */}
      <div className="pointer-events-none absolute inset-0">
        {/* Slow-zoom image layer (Ken Burns) */}
        <motion.div
          aria-hidden
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: "easeOut", repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(1200px 600px at 50% -10%, rgba(251,146,60,0.18), transparent 60%), radial-gradient(900px 500px at 90% 30%, rgba(251,146,60,0.12), transparent 60%), linear-gradient(to bottom, #0a0a0c, #050507 55%)",
          }}
        />
        {/* Anamorphic light leak */}
        <div className="absolute -left-1/4 top-1/2 h-[1px] w-[150%] -translate-y-1/2 rotate-[-8deg] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent blur-[1px] opacity-60" />
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.06] blur-[80px]" />
        {/* Vignette + film grain */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_42%,_rgba(0,0,0,0.72)_88%)]" />
        <div className="absolute inset-0 opacity-[0.035] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
        {/* Letterbox */}
        <div className="absolute inset-x-0 top-0 h-[18px] bg-black sm:h-[22px]" />
        <div className="absolute inset-x-0 bottom-0 h-[18px] bg-black sm:h-[22px]" />
        {/* Top/bottom hairline */}
        <div className="absolute inset-x-0 top-[18px] h-px bg-white/10 sm:top-[22px]" />
        <div className="absolute inset-x-0 bottom-[18px] h-px bg-white/10 sm:bottom-[22px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:py-14">
        {/* Cinematic chrome — REC + timecode + slate */}
        <div className="pointer-events-none absolute inset-x-6 top-2 hidden items-center justify-between text-[10px] tracking-[0.18em] text-white/40 sm:flex">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" /> REC • STBY
          </span>
          <span className="font-mono">00:42:17:04 • 24FPS • 2.39:1</span>
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-black">STUDYSHIELD • TAKE 01</span>
        </div>

        {/* Eyebrow — now amber on black, more filmic */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-medium tracking-[0.14em] text-white/80 backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          BUILT WITH JEE/NEET TOPPERS • 12k+ ACTIVE
        </motion.div>

        <div className="mx-auto mt-8 max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.04 }}
            className="text-center text-[10px] tracking-[0.32em] text-white/30"
          >
            ANAMORPHIC • SHOT ON STUDYSHIELD • EST. 2024
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="text-balance font-[850] leading-[0.88] tracking-[-0.05em] text-white [text-shadow:0_1px_0_rgba(255,255,255,0.06),0_12px_40px_rgba(0,0,0,0.6)]"
          >
            <span className="block text-[44px] sm:text-[68px] lg:text-[84px]">Your unfair</span>
            <span className="block bg-gradient-to-r from-amber-200 via-amber-300 to-orange-400 bg-clip-text text-[44px] font-serif font-[300] italic tracking-[-0.04em] text-transparent sm:text-[68px] lg:text-[84px]">
              advantage
            </span>
            <span className="block text-[44px] font-[600] tracking-[-0.04em] text-white/90 sm:text-[68px] lg:text-[84px]">for JEE &amp; NEET.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mx-auto mt-6 max-w-2xl text-pretty text-[17px] leading-relaxed text-zinc-400"
          >
            StudyShield is the study OS that plans your day, kills backlog, and keeps you in deep focus —
            so you stop deciding <span className="text-zinc-200">what</span> to study and start actually finishing it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-[15px] font-semibold text-black transition hover:bg-zinc-100 sm:w-auto"
            >
              Start free — no card <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/#showcase"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-7 py-4 text-[15px] font-medium text-white backdrop-blur hover:bg-white/[0.08] sm:w-auto"
            >
              <Play className="h-4 w-4 fill-white" /> See 30s demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500"
          >
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Free for core features</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-amber-400" /> No spam, export anytime</span>
          </motion.div>
        </div>

        {/* Product frame — bento mock */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-12 max-w-5xl"
        >
          <div className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900/40 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur">
            {/* Film perforations */}
            <div className="pointer-events-none absolute inset-y-2 left-1 hidden w-5 flex-col justify-between py-2 opacity-20 sm:flex">
              {[...Array(8)].map((_, i) => (
                <span key={i} className="h-6 w-3 rounded-sm bg-white" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-2 right-1 hidden w-5 flex-col justify-between py-2 opacity-20 sm:flex">
              {[...Array(8)].map((_, i) => (
                <span key={i} className="h-6 w-3 rounded-sm bg-white" />
              ))}
            </div>
            {/* Light leak on hover */}
            <div className="pointer-events-none absolute -inset-px opacity-0 transition duration-700 group-hover:opacity-100">
              <div className="absolute -left-1/2 top-0 h-px w-[200%] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent blur-[1px]" />
            </div>
            <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3 sm:px-6">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-3 hidden items-center gap-2 text-xs tracking-wide text-zinc-500 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> studyshield.study — Today • 6:42 AM • Focus streak 18 days
              </span>
              <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 ring-1 ring-emerald-500/20 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
              </span>
            </div>

            <div className="grid gap-2 p-2 sm:grid-cols-12">
              {/* Left — Today */}
              <div className="sm:col-span-7 rounded-2xl border border-white/10 bg-[#0c0c0e] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Today</h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black">82% done</span>
                </div>
                <div className="space-y-2">
                  {[
                    { t: '08:00 • Physics', d: 'Rotational Mechanics — DPP 12', c: 'emerald', done: true },
                    { t: '10:30 • Chemistry', d: 'Electrochemistry — PYQ set', c: 'amber', done: true },
                    { t: '14:00 • Maths', d: 'Calculus — Module 4', c: 'zinc', done: false },
                  ].map((r) => (
                    <div key={r.d} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.done ? 'border-white/5 bg-white/[0.02] opacity-70' : 'border-amber-500/20 bg-amber-500/10'}`}>
                      <span className={`h-2 w-2 rounded-full ${r.c === 'emerald' ? 'bg-emerald-400' : r.c === 'amber' ? 'bg-amber-400' : 'bg-zinc-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{r.d}</p>
                        <p className="text-xs text-zinc-500">{r.t}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${r.done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500 text-black'}`}>
                        {r.done ? 'Done' : 'Next'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Planned</p>
                    <p className="text-lg font-semibold text-white">6h 20m</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Completed</p>
                    <p className="text-lg font-semibold text-white">5h 10m</p>
                  </div>
                  <div className="rounded-xl bg-amber-500 p-3 text-black">
                    <p className="text-[11px] uppercase tracking-wide text-black/60">Streak</p>
                    <p className="flex items-center gap-1 text-lg font-bold"><Flame className="h-4 w-4" /> 18 days</p>
                  </div>
                </div>
              </div>

              {/* Right — stack */}
              <div className="grid gap-2 sm:col-span-5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-white"><Target className="h-4 w-4 text-amber-400" /> Focus</span>
                    <span className="text-xs text-zinc-500">Pomodoro 25:00</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-[650] tracking-tight text-white">25:00</span>
                    <span className="text-sm text-emerald-400">+50 XP on finish</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-[68%] rounded-full bg-amber-500" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-white"><ListTodo className="h-4 w-4 text-zinc-400" /> Backlog</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-sm text-zinc-300">Thermodynamics</span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-300">2 left</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-sm text-zinc-300">Organic Conversion</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">1 left</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500 to-orange-500 p-[1px]">
                  <div className="rounded-[15px] bg-[#0c0c0e] p-4">
                    <p className="text-sm font-semibold text-white">AI Mentor says</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      “You’re 82% done today. Finish the Calculus module before 8pm and you’ll hit 95% — your best this week.”
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/5 px-3 py-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Avg +1.4h vs last week</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1"><Users className="h-3.5 w-3.5" /> 12,400 learners</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1"><Award className="h-3.5 w-3.5 text-amber-400" /> #1 on ProductHunt Education</span>
            </div>
          </div>
        </motion.div>

        {/* Trust bar — film strip */}
        <div className="relative mx-auto mt-8 max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-black">
          <div className="absolute inset-x-0 top-0 flex h-2 items-center justify-between bg-[#0a0a0a] px-1">
            {[...Array(24)].map((_, i) => (
              <span key={i} className="h-1.5 w-2 rounded-sm bg-white/20" />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-2 items-center justify-between bg-[#0a0a0a] px-1">
            {[...Array(24)].map((_, i) => (
              <span key={i} className="h-1.5 w-2 rounded-sm bg-white/20" />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 px-4 py-5 text-xs tracking-widest text-zinc-500 sm:justify-between sm:px-6">
            <span className="flex items-center gap-2">
              <span className="h-px w-6 bg-white/20" /> TRUSTED BY LEARNERS FROM
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 font-semibold tracking-tighter text-zinc-300 sm:gap-10">
              <span>ALLEN</span><span>FIITJEE</span><span>AAKASH</span><span>RESONANCE</span><span>UNACADEMY</span>
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mx-auto mt-6 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-[0.24em] text-white/30">SCROLL</span>
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

const ForJeeNeet = () => (
  <section className="mx-auto max-w-7xl px-6">
    <div className="grid gap-4 md:grid-cols-2">
      {[
        {
          icon: <Calculator className="h-5 w-5" />,
          title: 'Built for JEE',
          points: ['PYQ-first practice', 'Formula Vault with 454 formulas', 'Mistake analysis per chapter'],
          accent: 'from-amber-500/10 to-orange-500/10 border-amber-500/15',
        },
        {
          icon: <Stethoscope className="h-5 w-5" />,
          title: 'Built for NEET',
          points: ['NCERT-aligned revision', 'Bio diagrams + mnemonics', 'Weekly mock with negative marking'],
          accent: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/15',
        },
      ].map((c) => (
        <div key={c.title} className={`rounded-[20px] border bg-gradient-to-br p-[1px] ${c.accent}`}>
          <div className="rounded-[19px] bg-[#0a0a0c] p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white">
              {c.icon} {c.title}
            </div>
            <ul className="mt-2 space-y-2 text-sm text-zinc-400">
              {c.points.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const FeaturesBento = () => {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-zinc-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Everything you need, nothing you don’t
        </p>
        <h2 className="mt-4 text-balance text-3xl font-[650] tracking-tight text-white sm:text-5xl">
          Study OS, <span className="font-serif italic font-[300] text-amber-300">not another planner.</span>
        </h2>
        <p className="mt-3 text-pretty text-zinc-500">Six primitives that compound. Use one or use all — they share the same backlog and streak.</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-12">
        {/* Large — AI Planner */}
        <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0c0c0e] p-6 sm:col-span-8">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-[60px] transition group-hover:bg-amber-500/15" />
          <div className="flex items-center gap-2 text-amber-300">
            <Brain className="h-4 w-4" /> <span className="text-xs font-semibold tracking-wide">AI PLANNER</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white">Plans tomorrow in 12 seconds</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
            Ingests your syllabus, backlog, and available hours. Outputs a minute-perfect day that respects prerequisites and your energy.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              { k: 'Backlog', v: 'Auto' },
              { k: 'Revision', v: 'Spaced' },
              { k: 'Focus', v: 'Deep' },
            ].map((s) => (
              <div key={s.k} className="rounded-xl bg-white/[0.04] px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{s.k}</p>
                <p className="text-sm font-semibold text-white">{s.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Small — Focus */}
        <div className="rounded-[24px] border border-white/10 bg-[#0c0c0e] p-6 sm:col-span-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">Focus, not pomodoro theatre</h3>
          <p className="mt-1 text-sm text-zinc-500">Streaks, XP, and strict mode that actually blocks distractions.</p>
        </div>

        {/* Small — Vault */}
        <div className="rounded-[24px] border border-white/10 bg-white p-6 text-black sm:col-span-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Formula Vault</h3>
          <p className="mt-1 text-sm text-zinc-600">454 formulas, searchable, with PYQ relevance. Offline-ready.</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white">
            <Beaker className="h-3.5 w-3.5" /> Physics • Chemistry • Maths
          </div>
        </div>

        {/* Large — Backlog */}
        <div className="rounded-[24px] border border-white/10 bg-[#0c0c0e] p-6 sm:col-span-8">
          <div className="flex items-center gap-2 text-zinc-300">
            <ListTodo className="h-4 w-4" /> <span className="text-xs font-semibold tracking-wide">BACKLOG</span>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">Auto +12 XP</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold text-white">Turn “pending” into done</h3>
          <p className="mt-2 text-sm text-zinc-500">Lecture → DPP → PYQ → Revision. One pipeline, zero spreadsheets.</p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black">Lecture</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">DPP</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">PYQ</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white">Revision</span>
          </div>
        </div>

        {/* Two small */}
        <div className="rounded-[24px] border border-white/10 bg-[#0c0c0e] p-6 sm:col-span-6">
          <BarChart3 className="h-5 w-5 text-amber-400" />
          <h3 className="mt-3 text-lg font-semibold text-white">Analytics that matter</h3>
          <p className="mt-1 text-sm text-zinc-500">7-day completion, streak, and pace vs syllabus. No vanity metrics.</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-[#0c0c0e] p-6 sm:col-span-6">
          <RefreshCw className="h-5 w-5 text-zinc-400" />
          <h3 className="mt-3 text-lg font-semibold text-white">Revision that sticks</h3>
          <p className="mt-1 text-sm text-zinc-500">1→3→7→15→30→60 day spaced schedule. Due today = do today.</p>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    { n: '01', t: 'Tell us where you are', d: 'Exam, syllabus, and what’s pending. 45 seconds.' },
    { n: '02', t: 'AI builds your day', d: 'Backlog + revision + focus blocks, sequenced by dependency.' },
    { n: '03', t: 'You execute, we track', d: 'One tap per task. Streak and XP update instantly.' },
    { n: '04', t: 'We adapt', d: 'Missed a day? Plan rebalances. No shame, just next step.' },
  ];
  return (
    <section id="how-it-works" className="border-y border-white/5 bg-white/[0.02] py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-[650] tracking-tight text-white sm:text-5xl">
            How it <span className="font-serif italic font-[300] text-amber-300">works</span>
          </h2>
          <p className="max-w-md text-sm text-zinc-500">No onboarding theatre. Four steps and you’re in flow.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-[20px] border border-white/10 bg-[#0a0a0c] p-6">
              <p className="text-xs tracking-widest text-amber-300">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Proof = () => (
  <section className="mx-auto max-w-7xl px-6 py-12">
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { v: '4.2h', l: 'Avg saved weekly', s: 'vs manual planning' },
        { v: '18 days', l: 'Median streak', s: 'after first week' },
        { v: '94%', l: 'Say they feel in control', s: 'in-app survey, n=1,082' },
      ].map((p) => (
        <div key={p.v} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-3xl font-[650] tracking-tight text-white">{p.v}</p>
          <p className="text-sm font-medium text-white">{p.l}</p>
          <p className="text-xs text-zinc-500">{p.s}</p>
        </div>
      ))}
    </div>
  </section>
);

const Testimonials = () => {
  const r = [
    { n: 'Rahul S.', e: 'JEE 2025 • 98.2 %ile', t: 'Backlog used to be a guilt pile. Now it’s a queue. I just do the next item the app shows.' },
    { n: 'Priya M.', e: 'NEET 2025 • 660/720', t: 'The revision scheduler is brutal—in a good way. It won’t let me skip Bio diagrams and it shows.' },
    { n: 'Aman K.', e: 'JEE 2026 aspirant', t: 'Cleanest study app I’ve tried. No gamified nonsense, just tasks, focus, and streak. I actually finish my day.' },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-12 sm:py-20">
      <h2 className="text-center text-2xl font-[650] tracking-tight text-white sm:text-4xl">
        Loved by <span className="font-serif italic font-[300] text-amber-300">serious</span> learners
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {r.map((x) => (
          <div key={x.n} className="rounded-[20px] border border-white/10 bg-[#0c0c0e] p-6">
            <div className="mb-3 flex gap-1 text-amber-400">★★★★★</div>
            <p className="text-sm leading-relaxed text-zinc-300">“{x.t}”</p>
            <p className="mt-4 text-sm font-semibold text-white">{x.n}</p>
            <p className="text-xs text-zinc-500">{x.e}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const FAQ = () => {
  const faqs = [
    { q: 'Is it only for JEE/NEET?', a: 'Optimized for JEE/NEET syllabi, but the planner, backlog, and focus tools work for any exam. You choose exam and chapters.' },
    { q: 'How does the AI planner know what to schedule?', a: 'It reads your syllabus, pending lectures/DPPs, revision due dates, and available hours, then orders tasks by dependency and your energy.' },
    { q: 'Can I use it on phone?', a: 'Yes. Fully responsive and installable as a PWA. Works offline for vault and focus; syncs when you’re back online.' },
    { q: 'What about my data?', a: 'Your data stays yours. Export anytime, delete anytime. No ads, no selling.' },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h2 className="text-center text-3xl font-[650] tracking-tight text-white sm:text-4xl">FAQ</h2>
      <div className="mt-8 space-y-3">
        {faqs.map((f, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left">
              <span className="pr-4 text-sm font-medium text-white">{f.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open === i ? 'rotate-180 text-amber-400' : ''}`} />
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5 text-sm leading-relaxed text-zinc-400">
                  {f.a}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
};

const CTA = () => (
  <section className="mx-auto max-w-7xl px-6 pb-16 sm:pb-24">
    <div className="relative overflow-hidden rounded-[32px] border border-amber-500/20 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-[1px]">
      <div className="rounded-[31px] bg-[#050507] px-6 py-12 text-center sm:px-12 sm:py-16">
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-500/20">
          <Zap className="h-3.5 w-3.5" /> Free to start • No credit card
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-balance text-3xl font-[650] tracking-tight text-white sm:text-5xl">
          Ready to <span className="font-serif italic font-[300] text-amber-300">study like a topper?</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">
          Join 12k+ learners who stopped planning and started finishing. Your next streak starts today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/signup" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-black hover:bg-zinc-100 sm:w-auto">
            Create your plan <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-7 py-4 text-sm font-medium text-white hover:bg-white/10 sm:w-auto">
            I already have an account
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">Takes 45 seconds • Cancel anytime • Export your data</p>
      </div>
    </div>
  </section>
);

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-amber-500/30">
      <SEO
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        canonical={CANONICAL.home}
        jsonLd={[
          { "@context": "https://schema.org", "@type": "Organization", name: "StudyShield", url: "https://studyshield.study/", logo: "https://studyshield.study/shield.svg", sameAs: [] },
          { "@context": "https://schema.org", "@type": "WebSite", name: "StudyShield", url: "https://studyshield.study/", inLanguage: "en-IN" },
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "StudyShield",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Web",
            url: "https://studyshield.study/",
            description: "StudyShield is an AI-powered study platform for JEE and NEET students offering personalized study plans, backlog management, revision planning, focus timer, distraction blocking and study tracking.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "Is it only for JEE/NEET?", acceptedAnswer: { "@type": "Answer", text: "Optimized for JEE/NEET, works for any exam." } },
              { "@type": "Question", name: "How does the AI planner work?", acceptedAnswer: { "@type": "Answer", text: "It uses syllabus, backlog, and hours to generate an optimized schedule." } },
              { "@type": "Question", name: "Can I use it on mobile?", acceptedAnswer: { "@type": "Answer", text: "Yes, fully responsive PWA." } },
            ],
          },
        ]}
      />
      <PublicNavbar />
      <main>
        <Hero />
        <ForJeeNeet />
        <FeaturesBento />
        <HowItWorks />
        <Suspense fallback={<section className="min-h-[600px]" />}>
          <AIPlannerShowcase />
        </Suspense>
        <Suspense fallback={<section className="min-h-[500px]" />}>
          <AIMentorShowcase />
        </Suspense>
        <Proof />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <PublicFooter />
    </div>
  );
}
