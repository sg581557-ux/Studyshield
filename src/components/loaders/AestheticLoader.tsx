import { motion } from "framer-motion";
import { Sparkles, Zap, BrainCircuit, Flame, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

// ── Shared shimmer bar ──
function ShimmerBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-full bg-white/[0.06] border border-white/[0.06]", className)}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
      />
    </div>
  );
}

// ── Crazy Full Page Loader — aurora + floating orb + particles ──
export function CrazyFullPageLoader({ message = "Loading your workspace…" }: { message?: string }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#070708] px-4">
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-[30%] left-1/2 h-[900px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,177,255,0.12),transparent_60%)] blur-3xl"
          animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -top-[10%] right-[-15%] h-[600px] w-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.14),transparent_60%)] blur-3xl"
          animate={{ opacity: [0.6, 0.9, 0.6], x: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        <motion.div
          className="absolute bottom-[-15%] left-[-10%] h-[500px] w-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_60%)] blur-3xl"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-white/20"
            style={{ left: `${18 + i * 13}%`, top: `${22 + (i % 3) * 18}%` }}
            animate={{ y: [-12, 12, -12], opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 backdrop-blur"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400">STUDYSHIELD OS</span>
          <span className="h-3 w-px bg-white/10 mx-1" />
          <span className="flex items-center gap-1 text-[11px] font-bold text-white">
            <Zap className="h-3 w-3 text-amber-400" /> LOADING
          </span>
        </motion.div>

        {/* Hero orb — crazy gradient with rotating conic + sparkles */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          {/* outer rotating conic */}
          <motion.div
            className="absolute inset-0 rounded-[28px] bg-[conic-gradient(from_0deg_at_50%_50%,#1d96f5_0deg,#7c3aed_120deg,#ec4899_240deg,#1d96f5_360deg)] opacity-60 blur-[1px]"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[2px] rounded-[26px] bg-[#070708]" />
          {/* inner orb */}
          <motion.div
            animate={{ y: [-3, 4, -3], rotate: [-1, 1.5, -1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex h-[92px] w-[92px] items-center justify-center rounded-[22px] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-accent-500 shadow-[0_16px_40px_rgba(124,58,237,0.4),0_1px_0_rgba(255,255,255,0.15)_inset] border border-white/10"
          >
            <div className="absolute inset-[1px] rounded-[20px] bg-gradient-to-br from-white/20 via-white/5 to-transparent pointer-events-none" />
            <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/20 blur-xl pointer-events-none" />
            <ShieldCheck className="relative h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]" strokeWidth={2} />
            {/* orbiting sparkle */}
            <motion.div
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg border border-violet-100"
              animate={{ y: [0, -6, 0], rotate: [0, 12, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
            </motion.div>
            <motion.div
              className="absolute -left-2 bottom-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0f0f10] border border-white/10 shadow-xl"
              animate={{ y: [0, 5, 0], x: [0, 3, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            >
              <BrainCircuit className="h-3.5 w-3.5 text-accent-400" />
            </motion.div>
          </motion.div>
          {/* twinkles */}
          <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} className="absolute right-6 -bottom-1 h-2 w-2 rounded-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.9)]" />
          <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.6, repeat: Infinity, delay: 0.7 }} className="absolute left-8 -top-1 h-1 w-1 rounded-full bg-accent-300" />
        </div>

        {/* Title with shimmer gradient */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-7 text-center">
          <h1 className="text-[22px] font-black tracking-tight">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">StudyShield</span>
            <span className="ml-2 bg-gradient-to-r from-accent-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent animate-pulse">•</span>
            <span className="ml-2 text-white">{message.split("…")[0]}</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[360px] text-xs leading-relaxed text-zinc-500">Syncing your planner, backlog & revision • crafting your study OS</p>
        </motion.div>

        {/* Progress shimmer + dots */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-gradient-to-br from-accent-500 to-violet-600 shadow-[0_0_8px_rgba(124,58,237,0.3)]"
                animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
            <span className="ml-2 text-[11px] font-semibold tracking-widest text-zinc-500">LOADING</span>
          </div>
          <div className="h-1.5 w-64 overflow-hidden rounded-full bg-white/[0.06] border border-white/[0.04] p-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-500 via-violet-500 to-fuchsia-500"
              initial={{ width: "12%" }}
              animate={{ width: ["12%", "78%", "42%", "92%", "68%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <p className="text-[11px] font-medium tracking-wide text-zinc-600">This won’t take long • your data is being prepared ✨</p>
        </div>
      </div>

      {/* bottom glow */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[1px] w-[480px] -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity }}
      />
    </div>
  );
}

// ── Crazy Inline Loader — compact but still aesthetic ──
export function CrazyInlineLoader({ message, size = "md" }: { message?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-36", md: "h-9 w-48", lg: "h-10 w-64" } as const;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-500 to-violet-600 blur-xl opacity-20 animate-pulse" />
        <div className="relative flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur px-4 py-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={cn("h-2 w-2 rounded-full", i === 1 ? "bg-violet-400" : "bg-accent-400")}
              animate={{ y: [-4, 4, -4], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
            />
          ))}
          <span className="ml-2 text-xs font-semibold tracking-widest text-zinc-400">LOADING</span>
        </div>
      </div>
      {message ? <p className="text-xs font-medium text-zinc-500 animate-pulse">{message}</p> : null}
      <ShimmerBar className={cn(sizes[size], "max-w-[80%]")} />
    </div>
  );
}

// ── Crazy Card Skeleton — for dashboard bento, analytics, etc. ──
export function CrazyCardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f10] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-gradient-to-br from-violet-600/10 to-accent-500/10 blur-2xl" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.04] animate-pulse" />
        <div className="flex-1 space-y-2">
          <ShimmerBar className="h-3 w-1/2" />
          <ShimmerBar className="h-2.5 w-1/3 opacity-60" />
        </div>
        <motion.div className="h-6 w-12 rounded-full bg-white/[0.04] border border-white/[0.04]" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }} />
      </div>
      <div className="mt-4 space-y-2.5">
        {[...Array(lines)].map((_, i) => (
          <ShimmerBar key={i} className={cn("h-3", i === lines - 1 ? "w-3/4" : i % 2 === 0 ? "w-full" : "w-5/6")} />
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <ShimmerBar className="h-7 w-20 rounded-full" />
        <ShimmerBar className="h-7 w-24 rounded-full opacity-70" />
      </div>
    </div>
  );
}

export function CrazyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
          <CrazyCardSkeleton lines={3} />
        </motion.div>
      ))}
    </div>
  );
}

export function CrazyListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur p-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-violet-600/20 to-accent-500/20 border border-white/[0.06] animate-pulse" />
          <div className="flex-1 space-y-2">
            <ShimmerBar className="h-3 w-2/3" />
            <ShimmerBar className="h-2.5 w-1/2 opacity-60" />
          </div>
          <ShimmerBar className="h-7 w-16 rounded-full hidden sm:block" />
        </motion.div>
      ))}
    </div>
  );
}

export function CrazyTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f10]">
      <div className="flex gap-2 border-b border-white/[0.04] bg-white/[0.02] p-3">
        {[...Array(4)].map((_, i) => (
          <ShimmerBar key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-white/[0.03]">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <ShimmerBar className="h-8 w-8 rounded-lg shrink-0" />
            <ShimmerBar className="h-3 flex-1" />
            <ShimmerBar className="h-3 w-20 hidden sm:block" />
            <ShimmerBar className="h-7 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrazyStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.07 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur p-4"
        >
          <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-violet-600/10 to-transparent blur-xl" />
          <ShimmerBar className="h-2.5 w-16" />
          <ShimmerBar className="mt-3 h-7 w-12" />
          <ShimmerBar className="mt-2 h-2 w-full opacity-50" />
        </motion.div>
      ))}
    </div>
  );
}

export function CrazyChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f10] p-5">
      <div className="flex items-center justify-between">
        <ShimmerBar className="h-4 w-32" />
        <ShimmerBar className="h-7 w-20 rounded-full" />
      </div>
      <div className="mt-6 flex items-end gap-2 h-40">
        {[0.45, 0.72, 0.38, 0.85, 0.52, 0.68, 0.92, 0.41].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-xl bg-gradient-to-t from-violet-600/30 via-accent-500/20 to-white/5 border border-white/[0.04] border-b-0"
            initial={{ height: 8 }}
            animate={{ height: `${h * 100}%` }}
            transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <ShimmerBar className="h-2 flex-1" />
        <ShimmerBar className="h-2 flex-1 opacity-60" />
        <ShimmerBar className="h-2 flex-1 opacity-40" />
      </div>
    </div>
  );
}

export function CrazyButtonLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-white/20" />
        <motion.span className="absolute inset-0 rounded-full border-2 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
      </span>
      {label}
    </span>
  );
}
