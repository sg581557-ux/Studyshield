import { useLayoutEffect, useRef, useState } from "react";
import { useMounted } from "../../lib/useMounted";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Brain,
  CalendarCheck,
  Clock3,
  Gauge,
  Layers,
  Play,
  RotateCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const EASE_OPEN: [number, number, number, number] = [0.65, 0, 0.35, 1];

interface ScheduleTask {
  id: string;
  time: string;
  subject: string;
  title: string;
  done: boolean;
  color: string;
}

interface SubjectCard {
  id: string;
  name: string;
  progress: number;
  color: string;
  icon: React.ReactNode;
}

interface MobileScheduleTask {
  id: string;
  time: string;
  title: string;
  progress: number;
}

interface FeatureBadge {
  label: string;
  icon: React.ReactNode;
  color: "cyan" | "emerald" | "violet" | "blue";
}

const MOBILE_SCHEDULE_TASKS: MobileScheduleTask[] = [
  { id: "1", time: "08:00", title: "Physics Lecture", progress: 90 },
  { id: "2", time: "10:00", title: "Maths Practice", progress: 60 },
  { id: "3", time: "13:00", title: "Chemistry Revision", progress: 80 },
  { id: "4", time: "16:00", title: "PYQs", progress: 50 },
];

const FEATURE_BADGES: FeatureBadge[] = [
  { label: "AI Optimized", icon: <Brain className="h-3 w-3" />, color: "cyan" },
  { label: "Adaptive Schedule", icon: <RotateCw className="h-3 w-3" />, color: "emerald" },
  { label: "Backlog Reduced", icon: <TrendingUp className="h-3 w-3" />, color: "violet" },
  { label: "Smart Revision", icon: <Target className="h-3 w-3" />, color: "blue" },
];

const SCHEDULE_TASKS: ScheduleTask[] = [
  {
    id: "1",
    time: "7:00 AM",
    subject: "Physics",
    title: "Rotational Motion · Lecture 2",
    done: true,
    color: "cyan",
  },
  {
    id: "2",
    time: "9:30 AM",
    subject: "Maths",
    title: "Calculus · 30 practice Qs",
    done: true,
    color: "emerald",
  },
  {
    id: "3",
    time: "4:00 PM",
    subject: "Chemistry",
    title: "States of Matter · DPP + revision",
    done: false,
    color: "violet",
  },
];

const SUBJECT_CARDS: SubjectCard[] = [
  {
    id: "physics",
    name: "Physics",
    progress: 82,
    color: "from-cyan-400 to-blue-500",
    icon: <Layers className="h-3.5 w-3.5 text-cyan-300" />,
  },
  {
    id: "maths",
    name: "Maths",
    progress: 64,
    color: "from-emerald-400 to-teal-500",
    icon: <Layers className="h-3.5 w-3.5 text-emerald-300" />,
  },
  {
    id: "chemistry",
    name: "Chemistry",
    progress: 71,
    color: "from-violet-400 to-purple-500",
    icon: <Layers className="h-3.5 w-3.5 text-violet-300" />,
  },
];

const WEEK_PROGRESS = [34, 48, 42, 58, 66, 52, 72];

const AI_SUGGESTION =
  "You peak between 10 AM and 12 PM — high-focus Physics goes there. 3 backlog topics left to close this week.";

function SubjectChip({ subject }: { subject: ScheduleTask["subject"] }) {
  const colorMap: Record<string, string> = {
    Physics: "text-cyan-300 bg-cyan-400/10 border-cyan-400/25",
    Maths: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25",
    Chemistry: "text-violet-300 bg-violet-400/10 border-violet-400/25",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[7px] font-semibold ${colorMap[subject] ?? "text-slate-300 bg-white/5 border-white/10"}`}
    >
      {subject}
    </span>
  );
}

function PlannerCard() {
  const reduced = useReducedMotion();
  const mounted = useMounted();

  return (
    <div className="relative w-[340px] max-w-[90vw] overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.045] shadow-[0_30px_80px_-20px_rgba(2,6,23,0.8),0_0_50px_rgba(56,189,248,0.12)] backdrop-blur-2xl">
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="absolute -left-24 -top-24 h-52 w-52 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.06), transparent 55%)",
          }}
        />
      </div>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_18px_rgba(34,211,238,0.45)]"
              animate={mounted && !reduced ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <p className="text-[10px] font-bold leading-none tracking-[0.22em] text-cyan-200">
                AI PLANNER
              </p>
              <p className="mt-0.5 text-[9px] leading-none text-slate-400">
                Good morning, Rahul
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.span
              className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-[7px] font-semibold text-cyan-300"
              animate={mounted && !reduced ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain className="h-2.5 w-2.5" />
            </motion.span>
            <span className="flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[8px] font-semibold text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
              </span>
              Live
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Today's Schedule */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="h-3 w-3 text-cyan-300" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  Today&apos;s Schedule
                </span>
              </div>
              <span className="text-[8px] font-semibold text-cyan-300">
                3 tasks
              </span>
            </div>
            <div className="space-y-1.5">
              {SCHEDULE_TASKS.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * SCHEDULE_TASKS.indexOf(task) }}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5"
                >
                  <span className="w-12 shrink-0 text-[8px] font-semibold text-slate-500">
                    {task.time}
                  </span>
                  <SubjectChip subject={task.subject} />
                  <p className="min-w-0 flex-1 truncate text-[9px] font-medium text-slate-200">
                    {task.title}
                  </p>
                  <motion.span
                    initial={{ scale: task.done ? 1 : 0.8, opacity: task.done ? 1 : 0 }}
                    animate={{ scale: task.done ? 1 : 0.8, opacity: task.done ? 1 : 0 }}
                    transition={{ duration: 0.2, delay: 0.1 * SCHEDULE_TASKS.indexOf(task) }}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] text-[8px] ${
                      task.done
                        ? "bg-emerald-400 text-slate-950"
                        : "border border-slate-500/50"
                    }`}
                  >
                    {task.done ? "✓" : ""}
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Subject Cards */}
          <div className="space-y-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
              Subject Focus
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SUBJECT_CARDS.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.3,
                    delay: 0.05 * i,
                    ease: [0.65, 0, 0.35, 1],
                  }}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <div className="p-2">
                    <div className="mb-1 flex items-center justify-between">
                      {card.icon}
                      <span className="text-[8px] font-bold text-slate-400">
                        {card.progress}%
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-slate-100">
                      {card.name}
                    </p>
                  </div>
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 rounded-b-xl"
                    style={{
                      background: `linear-gradient(to right, ${
                        card.color.split(" ")[0]
                      }, ${card.color.split(" ")[2]})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${card.progress}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: "easeOut" }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Focus Score */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3 w-3 text-violet-300" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  Focus Score
                </span>
              </div>
              <motion.span
                className="text-lg font-bold text-white"
                animate={mounted && !reduced ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                87
              </motion.span>
            </div>
            <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-[73%] rounded-full bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300"
                initial={{ width: 0 }}
                animate={{ width: "73%" }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
            <p className="text-[7.5px] text-slate-500">
              Your AI adapts the schedule based on real-time focus patterns
            </p>
          </div>

          {/* Backlog Reduction */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RotateCw className="h-3 w-3 text-rose-300" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  Backlog Reduction
                </span>
              </div>
              <span className="text-[8px] font-bold text-emerald-300">-42%</span>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-xs font-bold text-white">12/19</span>
              <span className="text-[7.5px] text-slate-500">chapters cleared</span>
            </div>
            <motion.div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full w-[63%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: "63%" }}
                transition={{ duration: 0.9, delay: 0.45, ease: "easeOut" }}
              />
            </motion.div>
            <div className="mt-1.5 flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
              <span className="text-[7.5px] font-semibold text-emerald-300">
                5 topics cleared this week
              </span>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock3 className="h-3 w-3 text-blue-300" />
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                  Weekly Progress
                </span>
              </div>
              <span className="text-xs font-bold text-white">4h 30m</span>
            </div>
            <div className="flex h-6 items-end gap-[2px]">
              {WEEK_PROGRESS.map((v, i) => (
                <motion.span
                  key={i}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{
                    delay: 0.2 + i * 0.04,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  className="relative flex-1 origin-bottom rounded-[2px] bg-gradient-to-t from-blue-500/70 to-cyan-300/90"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>

          {/* AI Suggestion */}
          <motion.div
            className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-violet-500/10 p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5, ease: EASE_OPEN }}
          >
            <div className="flex items-start gap-1.5">
              <motion.div
                animate={mounted && !reduced ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
              </motion.div>
              <div>
                <p className="text-[7.5px] font-bold uppercase tracking-widest text-cyan-200">
                  AI Adaptation
                </p>
                <p className="mt-0.5 leading-relaxed text-[8px] text-slate-300">
                  {AI_SUGGESTION}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MobilePlannerScreen() {
  const reduced = useReducedMotion();
  const mounted = useMounted();

  const progressColors = [
    "from-cyan-400 to-blue-500",
    "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-orange-400 to-rose-500",
  ];

  return (
    <div
      className="relative h-full w-full overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #030512 0%, #081233 45%, #0a0a0f 100%)",
      }}
    >
      <div className="p-3.5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600"
              animate={mounted && !reduced ? { rotate: [0, 6, -6, 0] } : {}}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield className="h-4 w-4 text-white" />
            </motion.div>
            <div>
              <p className="text-[8px] font-bold leading-none tracking-[0.18em] text-cyan-200">
                AI PLANNER
              </p>
              <p className="mt-0.5 text-[7px] leading-none text-slate-500">
                Today&apos;s Plan
              </p>
            </div>
          </div>
          <motion.span
            className="flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 text-[6px] text-cyan-300"
            animate={mounted && !reduced ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain className="h-2.5 w-2.5" />
          </motion.span>
        </div>

        {/* Schedule List */}
        <div className="mb-4 space-y-2.5">
          <p className="text-[7px] font-bold uppercase tracking-widest text-slate-500">
            Today&apos;s AI Plan
          </p>
          {MOBILE_SCHEDULE_TASKS.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.05 * i }}
              className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-100">
                  {task.time}
                </span>
                <span className="text-[7px] font-medium text-slate-400">
                  {task.title}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${progressColors[i % progressColors.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 + i * 0.05,
                    ease: "easeOut",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Focus Score & Backlog */}
        <div className="mb-4 space-y-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-slate-500">
                <Brain className="h-3 w-3 text-violet-300" />
                Focus Score
              </span>
              <motion.span
                className="text-base font-bold text-white"
                animate={mounted && !reduced ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                94%
              </motion.span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-[94%] rounded-full bg-gradient-to-r from-violet-400 via-cyan-300 to-emerald-300"
                initial={{ width: 0 }}
                animate={{ width: "94%" }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest text-slate-500">
                <TrendingUp className="h-3 w-3 text-emerald-300" />
                Backlog
              </span>
              <span className="text-xs font-bold text-emerald-300">↓ 18%</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-xs font-bold text-white">15/19</span>
              <span className="text-[7px] text-slate-500">chapters cleared</span>
            </div>
            <motion.div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full w-[79%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: "79%" }}
                transition={{ duration: 0.9, delay: 0.45, ease: "easeOut" }}
              />
            </motion.div>
          </div>
        </div>

        {/* AI Status */}
        <div className="rounded-lg border border-cyan-400/25 bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-violet-500/10 p-2.5">
          <div className="flex items-center gap-2">
            <motion.div
              animate={mounted && !reduced ? { rotate: [0, 12, -12, 0] } : {}}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
            </motion.div>
            <div>
              <p className="text-[7px] font-bold uppercase tracking-widest text-cyan-200">
                AI Status
              </p>
              <p className="text-[8px] text-slate-300">
                <span className="text-emerald-300">✓</span> Plan optimized
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

function MobilePhoneMockup() {
  const reduced = useReducedMotion();
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const phoneRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!phoneRef.current || reduced) return;
    const rect = phoneRef.current.getBoundingClientRect();
    setMouseX((e.clientX - rect.left) / rect.width - 0.5);
    setMouseY((e.clientY - rect.top) / rect.height - 0.5);
  };

  const resetMouse = () => {
    setMouseX(0);
    setMouseY(0);
  };

  const rotX = mouseY * 6;
  const rotY = mouseX * -6;

  return (
    <div
      ref={phoneRef}
      className="relative flex justify-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMouse}
    >
      <motion.div
        className="relative"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
        animate={mounted && !reduced ? { rotateX: rotX, rotateY: rotY } : {}}
        transition={{ type: "spring", stiffness: 250, damping: 30 }}
      >
        <div className="relative mx-auto">
          {/* Phone body */}
          <div className="relative h-[680px] w-[330px] max-w-[82vw] rounded-[44px] border-8 border-[#1a1a21] bg-[#0a0a0b] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)]">
            {/* Phone inner glow */}
            <div className="absolute inset-0 rounded-[36px] bg-gradient-to-b from-white/[0.04] to-transparent" />

            {/* Camera bump / notch */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-end gap-2">
              <span className="block h-1 w-7 rounded-full bg-[#121216]" />
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/40 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              <span className="block h-1 w-7 rounded-full bg-[#121216]" />
            </div>

            {/* Screen / display area */}
            <div className="absolute inset-4 top-[38px] overflow-hidden rounded-[34px]">
              <div className="relative h-full w-full">
                <MobilePlannerScreen />
              </div>
            </div>

            {/* Screen reflection highlight */}
            <div
              className="absolute inset-0 rounded-[40px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04), transparent 60%)",
              }}
            />
          </div>

          {/* Phone drop shadow */}
          <motion.div
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-12 w-44 rounded-full bg-black/30 blur-2xl"
            animate={mounted && !reduced ? { opacity: [0.3, 0.45, 0.3] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Floating badges around the phone */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 px-4 sm:gap-3 sm:px-0">
        {(reduced ? FEATURE_BADGES.slice(0, 2) : FEATURE_BADGES).map((badge, i) => (
          <motion.div
            key={badge.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            className={`flex items-center gap-1.5 rounded-full border border-${badge.color}-400/25 bg-${badge.color}-400/10 px-3 py-1 text-[8px] font-medium text-${badge.color}-300 backdrop-blur-md`}
          >
            {badge.icon}
            {badge.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DesktopDashboard() {
  const reduced = useReducedMotion();
  const [orbs] = useState(() =>
    Array.from({ length: 6 }).map(() => ({
      size: 2 + Math.random() * 2,
      left: 20 + Math.random() * 60,
      top: 10 + Math.random() * 80,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * 3,
    })),
  );
  const mounted = useMounted();

  const floatAnim = !mounted || reduced
    ? {}
    : { y: [0, -8, 0] };
  const floatTrans = !mounted || reduced
    ? { duration: 0 }
    : { duration: 6, repeat: Infinity, repeatType: "mirror" as const, ease: "easeInOut" };

  return (
    <motion.div
      className="relative"
      style={{ perspective: "1400px" }}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, ease: EASE_OPEN }}
    >
      {/* AI glow halo */}
      {!reduced && mounted && (
        <motion.div
          className="absolute -inset-16 rounded-full blur-[80px]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.1) 60deg, transparent 120deg, transparent 240deg, rgba(167,139,250,0.08) 300deg, transparent 360deg)",
            zIndex: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Floating feature chips */}
      <div className="absolute -top-8 left-1/2 flex -translate-x-1/2 gap-2.5 z-20">
        {[
          { label: "AI-Generated", icon: <Brain className="h-2.5 w-2.5" />, color: "cyan" },
          { label: "Live Sync", icon: <RotateCw className="h-2.5 w-2.5" />, color: "emerald" },
          { label: "Real-time Focus", icon: <Gauge className="h-2.5 w-2.5" />, color: "violet" },
        ].map((chip, i) => (
          <motion.div
            key={chip.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
            className={`flex items-center gap-1 rounded-full border border-${chip.color}-400/25 bg-${chip.color}-400/10 px-3 py-1.5 text-[9px] font-medium text-${chip.color}-300 backdrop-blur-md`}
          >
            {chip.icon}
            {chip.label}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative z-10 mx-auto"
        style={{
          transformStyle: "preserve-3d",
          transform: !reduced && mounted ? "rotateX(8deg)" : "none",
        }}
        animate={floatAnim}
        transition={floatTrans}
      >
        {/* Glassmorphism card backface */}
        <div
          className="absolute -inset-1 rounded-[32px] border border-white/5 bg-white/[0.02] shadow-[0_30px_100px_-20px_rgba(2,6,23,0.9)] backdrop-blur-3xl"
          style={{
            transform: "translateZ(-40px)",
            opacity: 0.4,
          }}
        />

        <div className="relative rounded-[28px] border border-white/12 bg-white/[0.045] shadow-[0_30px_100px_-20px_rgba(2,6,23,0.9),0_0_60px_rgba(56,189,248,0.15)] backdrop-blur-2xl">
          <div className="absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
            <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />
            <div className="absolute -bottom-40 -right-32 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.06), transparent 55%)",
              }}
            />
          </div>

          <div className="relative p-6">
            <PlannerCard />
          </div>
        </div>
      </motion.div>

      {/* Floating particles around the card */}
      {!reduced &&
        orbs.map((o, i) => (
          <motion.div
            key={i}
            className="absolute z-0 rounded-full bg-cyan-300/30"
            style={{
              width: `${o.size}px`,
              height: `${o.size}px`,
              left: `${o.left}%`,
              top: `${o.top}%`,
              filter: "blur(0.5px)",
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 0.5, 0],
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: o.duration,
              repeat: Infinity,
              delay: o.delay,
              ease: "easeInOut",
            }}
          />
        ))}
    </motion.div>
  );
}

export default function AIPlannerShowcase() {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [bgParticles] = useState(() =>
    Array.from({ length: 40 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      duration: 10 + Math.random() * 16,
      delay: Math.random() * 10,
      opacity: 0.15 + Math.random() * 0.3,
      driftX: (Math.random() - 0.5) * 30,
    })),
  );

  useLayoutEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <section
      id="showcase"
      className="relative scroll-mt-24 overflow-hidden py-16 md:py-24"
      style={{
        background: "linear-gradient(180deg, #030512 0%, #081233 45%, #0b1023 100%)",
      }}
    >
      {/* ===== Background ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage: "radial-gradient(ellipse at center, black 10%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 10%, transparent 72%)",
          }}
        >
          <motion.div
            className="absolute -inset-y-24 inset-x-0"
            style={{
              backgroundImage:
                "linear-gradient(0deg, transparent, rgba(56,189,248,0.06))",
              backgroundSize: "52px 52px",
            }}
            animate={!reduced ? { y: [0, 52, 0] } : {}}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <motion.div
          className="absolute left-[50%] top-1/2 h-[130%] w-[140%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.05) 16deg, transparent 34deg, transparent 170deg, rgba(124,58,237,0.05) 196deg, transparent 218deg)",
            filter: "blur(44px)",
          }}
          animate={!reduced ? { rotate: 360 } : {}}
          transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
        />

        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/12 blur-[120px]" />

        <motion.div
          className="absolute left-[8%] right-[8%] top-[16%] h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)",
            boxShadow: "0 0 14px rgba(34,211,238,0.3)",
          }}
          animate={
            !reduced
              ? { opacity: [0.12, 0.6, 0.12], scaleX: [1, 1.06, 1] }
              : { opacity: 0.12 }
          }
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[24%] right-[9%] h-24 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(59,130,246,0.35), transparent)",
            boxShadow: "0 0 12px rgba(59,130,246,0.3)",
          }}
          animate={
            !reduced ? { opacity: [0.12, 0.5, 0.12] } : { opacity: 0.12 }
          }
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute bottom-[30%] left-[8%] h-20 w-px"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(34,211,238,0.3), transparent)",
            boxShadow: "0 0 10px rgba(34,211,238,0.25)",
          }}
          animate={
            !reduced ? { opacity: [0.12, 0.45, 0.12] } : { opacity: 0.12 }
          }
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Background particles */}
        {!reduced &&
          bgParticles.map((p, i) => (
            <motion.span
              key={`bg-particle-${i}`}
              className="absolute rounded-full bg-cyan-300/60"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, filter: "blur(0.5px)" }}
              animate={{
                y: [0, -30, 0],
                x: [0, p.driftX],
                opacity: [0, p.opacity, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 35%, rgba(2,4,12,0.65) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/20000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
            backgroundSize: "160px 160px",
            opacity: 0.045,
            mixBlendMode: "overlay",
          }}
        />
      </div>

      {/* ===== Content ===== */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-24 sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE_OPEN }}
          className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-5 text-center"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </span>
            AI Planner Showcase
          </div>

          <h2 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Your AI{" "}
            <motion.span
              className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent"
              style={{ backgroundSize: "220% 100%" }}
              animate={!reduced ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : {}}
              transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            >
              Study Partner
            </motion.span>
          </h2>

          <p className="max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            StudyShield analyzes your lectures, backlog, revision, and practice to generate the smartest
            study plan every single day.
          </p>

          <div className="mt-2 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
            <motion.div
              animate={
                !reduced
                  ? {
                      boxShadow: [
                        "0 0 30px rgba(56,189,248,0.25)",
                        "0 0 55px rgba(139,92,246,0.4)",
                        "0 0 30px rgba(56,189,248,0.25)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full rounded-full sm:w-auto"
            >
              <Link
                to="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-8 py-4 text-sm font-bold text-white transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                Generate My AI Plan
                <Zap className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <button
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/10 sm:w-auto"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-cyan-400/20">
                <Play className="h-2.5 w-2.5 fill-current" />
              </span>
              See How It Works
            </button>
          </div>
        </motion.div>

        {/* ===== 3D Showcase ===== */}
      <motion.div
        initial={{ opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.9, ease: EASE_OPEN }}
        className="relative flex flex-col items-center justify-center gap-8 md:gap-12"
      >
        {isMobile ? <MobilePhoneMockup /> : <DesktopDashboard />}
        </motion.div>
      </div>
    </section>
  );
}
