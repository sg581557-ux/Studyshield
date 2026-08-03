import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Atom,
  Brain,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileQuestion,
  FlaskConical,
  Flame,
  Gauge,
  GraduationCap,
  Layers,
  MonitorPlay,
  NotebookPen,
  Play,
  RotateCcw,
  Shield,
  Sigma,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

const NeuralNetwork = lazy(() => import('./NeuralNetwork'));

const EASE_OPEN: [number, number, number, number] = [0.65, 0, 0.35, 1];
const EASE_FLY: [number, number, number, number] = [0.6, 0, 0.3, 1];

const SCENE_W = 980;
const SCENE_H = 780;
const CX = 490;
const CY = 430;
const RX = 402;
const RY = 208;
const ORBIT_STEPS = 60;

const rad = (deg: number) => (deg * Math.PI) / 180;

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

interface OrbitItem {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  angle: number;
  rf: number;
  dur: number;
  firstFly: number;
  floatDur: number;
  floatDelay: number;
}

const ORBIT_ITEMS: OrbitItem[] = [
  { id: 'physics', label: 'Physics', icon: Atom, color: '#38bdf8', angle: 0, rf: 1, dur: 46, firstFly: 7800, floatDur: 5.6, floatDelay: 0 },
  { id: 'chemistry', label: 'Chemistry', icon: FlaskConical, color: '#a78bfa', angle: 40, rf: 0.94, dur: 41, firstFly: 10200, floatDur: 6.4, floatDelay: 0.5 },
  { id: 'maths', label: 'Maths', icon: Sigma, color: '#34d399', angle: 80, rf: 1.04, dur: 49, firstFly: 12400, floatDur: 5.2, floatDelay: 1 },
  { id: 'lectures', label: 'Lectures', icon: MonitorPlay, color: '#60a5fa', angle: 120, rf: 0.96, dur: 43, firstFly: 8800, floatDur: 6.8, floatDelay: 0.3 },
  { id: 'pyqs', label: 'PYQs', icon: FileQuestion, color: '#f472b6', angle: 160, rf: 1.06, dur: 52, firstFly: 13500, floatDur: 5.8, floatDelay: 0.9 },
  { id: 'dpps', label: 'DPPs', icon: ClipboardList, color: '#fbbf24', angle: 200, rf: 0.92, dur: 38, firstFly: 9600, floatDur: 6, floatDelay: 0.6 },
  { id: 'mocktests', label: 'Mock Tests', icon: GraduationCap, color: '#fb7185', angle: 240, rf: 1.02, dur: 45, firstFly: 14200, floatDur: 5.4, floatDelay: 1.2 },
  { id: 'revision', label: 'Revision', icon: RotateCcw, color: '#22d3ee', angle: 280, rf: 0.9, dur: 40, firstFly: 11200, floatDur: 6.2, floatDelay: 0.7 },
  { id: 'notes', label: 'Notes', icon: NotebookPen, color: '#c084fc', angle: 320, rf: 0.98, dur: 48, firstFly: 15600, floatDur: 5, floatDelay: 1.4 },
];

const TASKS = [
  { time: '7:00 AM', sub: 'Physics', title: 'Rotational Motion · Lecture 2', done: true, chip: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/25' },
  { time: '9:30 AM', sub: 'Maths', title: 'Calculus · 30 practice Qs', done: true, chip: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25' },
  { time: '4:00 PM', sub: 'Chemistry', title: 'States of Matter · DPP + revision', done: false, chip: 'text-violet-300 bg-violet-400/10 border-violet-400/25' },
];

const PRIORITIES = [
  { label: 'Rotational Motion', tag: 'Weakest · New', pct: 82, bar: 'from-rose-400 to-orange-400', dot: '#fb7185' },
  { label: 'Calculus Backlog', tag: '3 topics pending', pct: 64, bar: 'from-cyan-400 to-blue-500', dot: '#22d3ee' },
];

const REVISION = [
  { label: 'Thermodynamics', due: 'Today', hot: true },
  { label: 'Kinematics', due: 'Tomorrow', hot: false },
  { label: 'Ionic Equilibrium', due: 'Fri', hot: false },
];

const WEEK_BARS = [34, 48, 42, 58, 66, 52, 72];

const SUGGESTION =
  'You peak between 10 AM and 12 PM — high-focus Physics goes there. 3 backlog topics left to close this week.';

const orbitKeyframes = (startDeg: number, rf: number) => {
  const kx = new Array<number>(ORBIT_STEPS);
  const ky = new Array<number>(ORBIT_STEPS);
  const times = new Array<number>(ORBIT_STEPS);
  for (let i = 0; i < ORBIT_STEPS; i++) {
    const a = rad(startDeg) + (i / (ORBIT_STEPS - 1)) * Math.PI * 2;
    kx[i] = Math.cos(a) * RX * rf;
    ky[i] = Math.sin(a) * RY * rf;
    times[i] = i / (ORBIT_STEPS - 1);
  }
  return { kx, ky, times };
};

interface BurstData {
  id: number;
  color: string;
}

const AbsorbBursts = ({ bursts }: { bursts: BurstData[] }) => (
  <>
    {bursts.map((b) => (
      <BurstLayer key={b.id} burst={b} />
    ))}
  </>
);

const BurstLayer = ({ burst }: { burst: BurstData }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        i,
        angle: Math.random() * Math.PI * 2,
        dist: 34 + Math.random() * 56,
        delay: Math.random() * 0.12,
      })),
    [burst.id],
  );

  return (
    <div className="pointer-events-none absolute z-40" style={{ left: CX, top: CY }}>
      <motion.span
        className="absolute h-6 w-6 rounded-full border border-cyan-300/60"
        style={{ x: '-50%', y: '-50%', boxShadow: `0 0 24px ${burst.color}66` }}
        initial={{ scale: 0.4, opacity: 1 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      {particles.map((p) => (
        <motion.span
          key={p.i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{ x: '-50%', y: '-50%', backgroundColor: burst.color, boxShadow: `0 0 10px ${burst.color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(p.angle) * p.dist, y: Math.sin(p.angle) * p.dist, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

const FlowBeams = ({ active }: { active: boolean }) => {
  const beams = useMemo(
    () =>
      [150, 25, 330, 210].map((deg) => {
        const a = rad(deg);
        const sx = CX + Math.cos(a) * (RX + 8);
        const sy = CY + Math.sin(a) * (RY + 8);
        const ex = CX + Math.cos(a) * 262;
        const ey = CY + Math.sin(a) * 158;
        const mx = (sx + ex) / 2 + Math.sin(a) * 52;
        const my = (sy + ey) / 2 - Math.cos(a) * 52;
        return { d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}` };
      }),
    [],
  );

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5]"
      width={SCENE_W}
      height={SCENE_H}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {beams.map((b, i) => (
        <motion.path
          key={i}
          d={b.d}
          fill="none"
          stroke="url(#beamGrad)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="5 15"
          animate={
            active
              ? { strokeDashoffset: [-60, 140], opacity: [0.25, 0.65, 0.25] }
              : { opacity: 0.15 }
          }
          transition={{ duration: 3.2, delay: i * 0.7, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </svg>
  );
};

const OrbitCard = ({
  item,
  active,
  onAbsorb,
}: {
  item: OrbitItem;
  active: boolean;
  onAbsorb: (id: string) => void;
}) => {
  const [phase, setPhase] = useState<'orbit' | 'fly' | 'away'>('orbit');
  const [orbitKey, setOrbitKey] = useState(0);

  useEffect(() => {
    if (!active || phase === 'orbit') return;
    setPhase('orbit');
    setOrbitKey((k) => k + 1);
  }, [active, phase]);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const timers: number[] = [];
    const at = (t: number, fn: () => void) => timers.push(window.setTimeout(fn, t));

    const loop = (first: boolean) => {
      at(first ? item.firstFly : 5600 + Math.random() * 4200, () => {
        if (!alive) return;
        setPhase('fly');
        at(1200, () => {
          if (!alive) return;
          setPhase('away');
          onAbsorb(item.id);
          at(1700, () => {
            if (!alive) return;
            setPhase('orbit');
            setOrbitKey((k) => k + 1);
            loop(false);
          });
        });
      });
    };
    loop(true);
    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active, item, onAbsorb]);

  const { kx, ky, times } = useMemo(() => orbitKeyframes(item.angle, item.rf), [item]);

  const Icon = item.icon;
  const chip = (
    <div
      className="flex items-center gap-1.5 rounded-xl border bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-md"
      style={{
        borderColor: `${item.color}40`,
        boxShadow: `0 6px 24px rgba(2,6,23,0.45), 0 0 16px ${item.color}2b`,
        transition: 'border-color .2s ease, box-shadow .2s ease',
      }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: item.color, filter: `drop-shadow(0 0 6px ${item.color}80)` }} />
      <span className="whitespace-nowrap text-[10px] font-semibold text-slate-100">{item.label}</span>
    </div>
  );

  return (
    <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: CX, top: CY }}>
      <motion.div
        key={orbitKey}
        initial={{ x: 0, y: 0, opacity: 0, scale: 0.35, rotate: 260 }}
        animate={
          phase === 'orbit'
            ? { x: kx, y: ky, opacity: 1, scale: 1, rotate: 0 }
            : { x: 0, y: 0, opacity: 0, scale: 0.06, rotate: 320 }
        }
        transition={
          phase === 'orbit'
            ? {
                x: { duration: item.dur, times, repeat: Infinity, ease: 'linear' },
                y: { duration: item.dur, times, repeat: Infinity, ease: 'linear' },
                rotate: { duration: 1.2 },
                opacity: { duration: 0.7 },
                scale: { duration: 0.7 },
              }
            : {
                x: { duration: 1.15, ease: 'easeIn' },
                y: { duration: 1.15, ease: 'easeIn' },
                rotate: { duration: 1.15, ease: 'easeIn' },
                opacity: { duration: 1.15, ease: 'easeIn' },
                scale: { duration: 1.15, ease: EASE_FLY },
              }
        }
      >
        <motion.div
          className="cursor-pointer"
          whileHover={{ scale: 1.12 }}
          animate={active ? { y: [0, -5, 0] } : {}}
          transition={
            active
              ? {
                  y: { duration: item.floatDur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: item.floatDelay },
                }
              : undefined
          }
          style={{
            boxShadow: `0 8px 30px rgba(2,6,23,0.5), 0 0 26px ${item.color}45`,
            borderRadius: 12,
            transition: 'box-shadow .2s ease',
          }}
        >
          {chip}
        </motion.div>
      </motion.div>
    </div>
  );
};

const SectionTitle = ({
  icon: Icon,
  children,
  color = 'text-cyan-300',
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  color?: string;
}) => (
  <div className="mb-2 flex items-center gap-1.5">
    <Icon className={`h-3 w-3 ${color}`} />
    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">{children}</span>
  </div>
);

const PlannerPanel = ({ absorbed }: { absorbed: number }) => (
  <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_80px_-20px_rgba(2,6,23,0.8),0_0_50px_rgba(56,189,248,0.12)] backdrop-blur-2xl">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
    <div className="absolute -left-24 -top-24 h-52 w-52 rounded-full bg-blue-600/25 blur-3xl" />
    <div className="absolute -bottom-28 -right-24 h-56 w-56 rounded-full bg-purple-600/20 blur-3xl" />
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: 'radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.06), transparent 55%)' }}
    />

    <div className="relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_18px_rgba(34,211,238,0.45)]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold leading-none tracking-[0.22em] text-cyan-200">AI PLANNER</p>
            <p className="mt-1 text-[9px] leading-none text-slate-400">Good morning, Rahul</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            key={absorbed}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[8px] font-semibold text-cyan-300"
          >
            <Brain className="h-2.5 w-2.5" />
            Synced {absorbed} sources
          </motion.span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-1 text-[8px] font-semibold text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </span>
            Live
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-3">
        <div className="col-span-7 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between">
              <SectionTitle icon={CalendarCheck}>Today&apos;s Schedule</SectionTitle>
              <span className="mb-2 text-[8px] font-semibold text-cyan-300">3 tasks</span>
            </div>
            <div className="space-y-1.5">
              {TASKS.map((t) => (
                <div
                  key={t.title}
                  className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5"
                >
                  <span className="w-12 shrink-0 text-[8px] font-semibold text-slate-500">{t.time}</span>
                  <span className={`shrink-0 rounded border px-1 py-px text-[7px] font-semibold ${t.chip}`}>{t.sub}</span>
                  <p className="min-w-0 flex-1 truncate text-[9px] font-medium text-slate-200">{t.title}</p>
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] text-[8px] ${
                      t.done ? 'bg-emerald-400 text-slate-950' : 'border border-slate-500/50'
                    }`}
                  >
                    {t.done ? '✓' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <SectionTitle icon={Target} color="text-amber-300">
              Smart Priorities
            </SectionTitle>
            <div className="space-y-2">
              {PRIORITIES.map((p) => (
                <div key={p.label}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.dot, boxShadow: `0 0 6px ${p.dot}` }} />
                      <p className="truncate text-[9px] font-semibold text-slate-100">{p.label}</p>
                    </div>
                    <span className="shrink-0 text-[7.5px] text-slate-500">{p.tag}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4, duration: 0.9, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${p.bar}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Study Hours</p>
                <Clock3 className="h-3 w-3 text-cyan-300" />
              </div>
              <p className="mt-1 text-lg font-bold leading-none text-white">
                4h <span className="text-xs font-medium text-slate-400">30m</span>
              </p>
              <div className="mt-1.5 flex h-6 items-end gap-[3px]">
                {WEEK_BARS.map((v, i) => (
                  <motion.span
                    key={i}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                    className="flex-1 origin-bottom rounded-[2px] bg-gradient-to-t from-blue-500/70 to-cyan-300/90"
                    style={{ height: `${v}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Productivity</p>
                <Gauge className="h-3 w-3 text-violet-300" />
              </div>
              <p className="mt-1 text-lg font-bold leading-none text-white">92</p>
              <span className="mt-0.5 flex items-center gap-0.5 text-[8px] font-semibold text-emerald-400">
                <TrendingUp className="h-2 w-2" /> +9% this week
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
            <div className="flex items-center justify-between">
              <SectionTitle icon={Layers}>Backlog Progress</SectionTitle>
              <span className="mb-2 text-[9px] font-bold text-cyan-300">64%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '64%' }}
                viewport={{ once: true }}
                transition={{ delay: 0.35, duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
              />
            </div>
            <p className="mt-1.5 text-[7.5px] text-slate-500">12 of 19 chapters cleared</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Weekly Goal</p>
                <Trophy className="h-3 w-3 text-amber-300" />
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <defs>
                    <linearGradient id="goalGrad">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                  <motion.circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="url(#goalGrad)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 14}
                    initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
                    whileInView={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - 0.72) }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 1.1, ease: 'easeOut' }}
                  />
                </svg>
                <div>
                  <p className="text-[11px] font-bold leading-none text-white">5/7</p>
                  <p className="mt-0.5 text-[7.5px] text-slate-500">chapters done</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
              <SectionTitle icon={RotateCcw} color="text-teal-300">
                Revision
              </SectionTitle>
              <div className="space-y-1">
                {REVISION.map((r) => (
                  <div key={r.label} className="flex items-center justify-between gap-1">
                    <p className="flex min-w-0 items-center gap-1 text-[8px] font-medium text-slate-200">
                      {r.hot && (
                        <span className="h-1 w-1 shrink-0 rounded-full bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,0.9)]" />
                      )}
                      <span className="truncate">{r.label}</span>
                    </p>
                    <span className="shrink-0 text-[7px] text-slate-500">{r.due}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-violet-500/10 p-2.5">
            <div className="flex items-start gap-1.5">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-cyan-300" />
              <div>
                <p className="text-[7.5px] font-bold uppercase tracking-widest text-cyan-200">AI Suggestion</p>
                <p className="mt-0.5 leading-relaxed text-[8px] text-slate-300">{SUGGESTION}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function AIPlannerShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const burstId = useRef(0);
  const pruneTimers = useRef<number[]>([]);

  const inView = useInView(sectionRef, { once: false, margin: '-12% 0px -12% 0px' });
  const reduced = useReducedMotion();
  const active = inView && !reduced;

  const [scale, setScale] = useState(0.85);
  const [absorbed, setAbsorbed] = useState(0);
  const [bursts, setBursts] = useState<BurstData[]>([]);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  const rotY = useTransform(sx, [-0.5, 0.5], [-7, 7]);
  const rotX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const glowX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const glowY = useTransform(sy, [-0.5, 0.5], [12, -12]);

  useLayoutEffect(() => {
    const el = scaleRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, Math.max(0.62, el.getBoundingClientRect().width / SCENE_W)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => pruneTimers.current.forEach((t) => window.clearTimeout(t)), []);

  const onAbsorb = useCallback((id: string) => {
    const item = ORBIT_ITEMS.find((o) => o.id === id);
    setAbsorbed((c) => c + 1);
    setBursts((prev) => [...prev, { id: burstId.current++, color: item?.color ?? '#22d3ee' }]);
    pruneTimers.current.push(
      window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== burstId.current - 1)), 1300),
    );
  }, []);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const resetMouse = () => {
    mx.set(0);
    my.set(0);
  };

  const bgParticles = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        dur: 10 + Math.random() * 16,
        delay: Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.3,
        drift: (Math.random() - 0.5) * 34,
      })),
    [],
  );

  const sparkDots = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 150 + Math.random() * 680,
        y: 120 + Math.random() * 540,
        size: 1 + Math.random() * 2,
        dur: 3 + Math.random() * 4,
        delay: Math.random() * 3,
      })),
    [],
  );

  const scrollToHow = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      id="showcase"
      ref={sectionRef}
      className="relative scroll-mt-24 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #030512 0%, #081233 45%, #0b1023 100%)' }}
    >
      {/* ===== Background ===== */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 72%)',
          }}
        >
          <motion.div
            className="absolute -inset-y-24 inset-x-0"
            style={{ backgroundImage: 'linear-gradient(0deg, transparent, rgba(56,189,248,0.06))', backgroundSize: '52px 52px' }}
            animate={{ y: [0, 52, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <motion.div
          className="absolute left-[50%] top-1/2 h-[120%] w-[130%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.05) 16deg, transparent 34deg, transparent 170deg, rgba(124,58,237,0.05) 196deg, transparent 218deg)',
            filter: 'blur(44px)',
          }}
          animate={active ? { rotate: 360 } : {}}
          transition={{ duration: 64, repeat: Infinity, ease: 'linear' }}
        />

        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/20 blur-[130px]" />
        <div className="absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cyan-500/12 blur-[120px]" />

        <motion.div
          className="absolute left-[8%] right-[8%] top-[16%] h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.4), transparent)',
            boxShadow: '0 0 14px rgba(34,211,238,0.3)',
          }}
          animate={active ? { opacity: [0.12, 0.6, 0.12], scaleX: [1, 1.06, 1] } : { opacity: 0.12 }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[24%] right-[9%] h-24 w-px"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(59,130,246,0.35), transparent)', boxShadow: '0 0 12px rgba(59,130,246,0.3)' }}
          animate={active ? { opacity: [0.12, 0.5, 0.12] } : { opacity: 0.12 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute bottom-[30%] left-[8%] h-20 w-px"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(34,211,238,0.3), transparent)', boxShadow: '0 0 10px rgba(34,211,238,0.25)' }}
          animate={active ? { opacity: [0.12, 0.45, 0.12] } : { opacity: 0.12 }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {bgParticles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full bg-cyan-300/60"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, filter: 'blur(1px)' }}
            animate={active ? { y: [-20, -180], x: [0, p.drift], opacity: [0, p.opacity, 0] } : { opacity: 0 }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          />
        ))}

        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(2,4,12,0.65) 100%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundImage: GRAIN, backgroundSize: '160px 160px', opacity: 0.045, mixBlendMode: 'overlay' }}
        />
      </div>

      {/* ===== Content ===== */}
      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 sm:pb-28 sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
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
            Your AI{' '}
            <motion.span
              className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-500 bg-clip-text text-transparent"
              style={{ backgroundSize: '220% 100%' }}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
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
              animate={{
                boxShadow: [
                  '0 0 30px rgba(56,189,248,0.25)',
                  '0 0 55px rgba(139,92,246,0.4)',
                  '0 0 30px rgba(56,189,248,0.25)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full rounded-full sm:w-auto"
            >
              <Link
                to="/signup"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-8 py-4 text-sm font-bold text-white transition hover:brightness-110 sm:w-auto"
              >
                <Sparkles className="h-4 w-4 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                Generate My AI Plan
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
            <button
              onClick={scrollToHow}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-sm font-semibold text-white backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/10 sm:w-auto"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 transition group-hover:bg-cyan-400/20">
                <Play className="h-2.5 w-2.5 fill-current" />
              </span>
              See How It Works
            </button>
          </div>
        </motion.div>

        {/* ===== Scene ===== */}
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, ease: EASE_OPEN }}
        >
          <div ref={scaleRef} className="relative mx-auto w-full" style={{ height: SCENE_H * scale }}>
            <div
              className="relative mx-auto"
              style={{ width: SCENE_W * scale, height: SCENE_H * scale }}
              onMouseMove={handleMouse}
              onMouseLeave={resetMouse}
            >
              <div
                className="absolute left-0 top-0"
                style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
              >
                {/* Neural network behind everything */}
                <Suspense fallback={null}>
                  <NeuralNetwork active={active} mouseX={sx} mouseY={sy} />
                </Suspense>

                {/* Flow beams */}
                <FlowBeams active={active} />

                {/* Orbit ring */}
                <motion.div
                  className="absolute rounded-[50%] border border-dashed border-cyan-400/20"
                  style={{ left: CX, top: CY, width: RX * 2, height: RY * 2, x: '-50%', y: '-50%' }}
                  animate={active ? { rotate: 360, opacity: [0.4, 0.9, 0.4] } : { opacity: 0.3 }}
                  transition={{
                    rotate: { duration: 46, repeat: Infinity, ease: 'linear' },
                    opacity: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                  }}
                />

                {/* Central glow */}
                <motion.div
                  className="absolute z-[1] rounded-full"
                  style={{
                    left: CX,
                    top: CY,
                    width: 640,
                    height: 640,
                    x: '-50%',
                    y: '-50%',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.18), rgba(99,102,241,0.09) 45%, transparent 70%)',
                  }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                  className="absolute z-[1] rounded-full"
                  style={{
                    left: CX,
                    top: CY,
                    width: 620,
                    height: 620,
                    x: '-50%',
                    y: '-50%',
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.12) 30deg, transparent 70deg, transparent 200deg, rgba(167,139,250,0.12) 240deg, transparent 290deg)',
                    filter: 'blur(20px)',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                />

                {/* Spark dots near the planner */}
                {active &&
                  sparkDots.map((s) => (
                    <motion.span
                      key={s.id}
                      className="absolute z-[2] rounded-full bg-cyan-300/70"
                      style={{ left: s.x, top: s.y, width: s.size, height: s.size, filter: 'blur(0.5px)' }}
                      animate={{ y: [0, -14, 0], opacity: [0.15, 0.9, 0.15], scale: [1, 1.4, 1] }}
                      transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ))}

                {/* Orbiting data cards */}
                {reduced ? (
                  ORBIT_ITEMS.map((item) => {
                    const a = rad(item.angle);
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: CX + Math.cos(a) * RX * item.rf, top: CY + Math.sin(a) * RY * item.rf }}
                      >
                        <div
                          className="flex items-center gap-1.5 rounded-xl border bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-md"
                          style={{ borderColor: `${item.color}40`, boxShadow: `0 6px 24px rgba(2,6,23,0.45), 0 0 16px ${item.color}2b` }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          <span className="text-[10px] font-semibold text-slate-100">{item.label}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    {ORBIT_ITEMS.map((item) => (
                      <OrbitCard key={item.id} item={item} active={active} onAbsorb={onAbsorb} />
                    ))}
                    <AbsorbBursts bursts={bursts} />
                  </>
                )}

                {/* Planner */}
                <motion.div
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: CX,
                    top: CY,
                    width: 540,
                    rotateX: reduced ? 0 : rotX,
                    rotateY: reduced ? 0 : rotY,
                    transformPerspective: 1300,
                  }}
                >
                  <motion.div
                    animate={active ? { y: [0, -10, 0] } : {}}
                    transition={{ duration: 6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                  >
                    <PlannerPanel absorbed={absorbed} />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
