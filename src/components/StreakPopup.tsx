import { useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Flame,
  Sparkles,
  Trophy,
  X,
  Star,
  Zap,
  Crown,
  PartyPopper,
  Rocket,
  Target,
  ChevronRight,
} from "lucide-react";
import { useScrollLock } from "../hooks/useScrollLock";

export interface StreakPopupProps {
  open: boolean;
  streak: number;
  longestStreak?: number;
  displayName?: string;
  onClose: () => void;
  /** optional CTA: navigate or custom action */
  onPrimaryAction?: () => void;
  /** called after exit animation completes — safe point to navigate without inert race */
  onExitComplete?: () => void;
}

type Milestone = {
  title: string;
  subtitle: string;
  accent: string;
  icon: typeof Flame;
  gradient: string;
};

function getMilestone(streak: number, longest: number): Milestone {
  const isNewRecord = streak > 1 && streak >= longest && longest > 0;
  if (streak === 0) {
    return {
      title: "Let's ignite your streak!",
      subtitle: "Complete one task today and start the fire. Every champion starts with day 1.",
      accent: "from-slate-500 to-zinc-600",
      icon: Target,
      gradient: "from-zinc-700/30 via-slate-600/20 to-zinc-900",
    };
  }
  if (isNewRecord && streak >= 30) {
    return {
      title: "LEGENDARY! 30-Day Inferno!",
      subtitle: `You've just set a new personal record — ${streak} days straight. You're elite. Keep the crown.`,
      accent: "from-amber-400 via-orange-500 to-red-500",
      icon: Crown,
      gradient: "from-amber-500/25 via-orange-500/20 to-red-600/25",
    };
  }
  if (isNewRecord && streak >= 14) {
    return {
      title: "Unstoppable — New Record!",
      subtitle: `${streak} days! You just beat your best. The habit is now who you are.`,
      accent: "from-violet-500 via-fuchsia-500 to-pink-500",
      icon: Trophy,
      gradient: "from-violet-600/25 via-fuchsia-500/20 to-pink-500/25",
    };
  }
  if (isNewRecord && streak >= 7) {
    return {
      title: "Week Warrior — New Record!",
      subtitle: `7 days in a row! You've turned study into identity. This is how toppers are made.`,
      accent: "from-emerald-400 via-teal-500 to-cyan-500",
      icon: Crown,
      gradient: "from-emerald-500/25 via-teal-500/20 to-cyan-500/25",
    };
  }
  if (streak >= 30) {
    return {
      title: "30-Day Streak — You're a Machine!",
      subtitle: "A full month of consistency. Very few can do this. Walk tall today.",
      accent: "from-amber-400 via-orange-500 to-red-500",
      icon: Crown,
      gradient: "from-amber-500/20 via-orange-500/15 to-red-500/20",
    };
  }
  if (streak >= 14) {
    return {
      title: "14-Day Streak — On Fire!",
      subtitle: "Two weeks straight! Your discipline is compounding — results will follow.",
      accent: "from-orange-400 via-amber-500 to-yellow-500",
      icon: Rocket,
      gradient: "from-orange-500/20 via-amber-500/15 to-yellow-500/20",
    };
  }
  if (streak >= 7) {
    return {
      title: "7-Day Streak! Flame On!",
      subtitle: "A full week — you've proven you can stay consistent. Now protect it.",
      accent: "from-red-500 via-orange-500 to-amber-500",
      icon: PartyPopper,
      gradient: "from-red-500/20 via-orange-500/15 to-amber-500/20",
    };
  }
  if (streak >= 3) {
    return {
      title: `${streak}-Day Streak — Momentum!`,
      subtitle: "Three days is the hardest part. You're past inertia — keep the chain unbroken.",
      accent: "from-orange-500 via-amber-500 to-yellow-500",
      icon: Zap,
      gradient: "from-orange-500/20 via-amber-500/15 to-yellow-400/20",
    };
  }
  if (streak === 2) {
    return {
      title: "2 Days Strong!",
      subtitle: "Back-to-back wins. One more day and the habit locks in. You've got this!",
      accent: "from-amber-500 via-orange-500 to-red-500",
      icon: Sparkles,
      gradient: "from-amber-500/15 via-orange-500/10 to-red-500/15",
    };
  }
  if (streak === 1) {
    return {
      title: "Day 1 — Fire Started!",
      subtitle: "Every streak starts here. Come back tomorrow and make it 2 — that's where magic begins.",
      accent: "from-amber-500 via-orange-500 to-red-400",
      icon: Flame,
      gradient: "from-amber-500/15 via-orange-400/10 to-red-400/10",
    };
  }
  return {
    title: `${streak}-Day Streak`,
    subtitle: "Consistency beats intensity. Keep showing up — the streak is your proof.",
    accent: "from-amber-500 to-orange-600",
    icon: Flame,
    gradient: "from-amber-500/15 to-orange-600/10",
  };
}

// Confetti particles — deterministic seed for stable keys
const CONFETTI_COLORS = ["#f59e0b", "#f97316", "#38bdf8", "#a78bfa", "#34d399", "#f472b6", "#facc15", "#fb7185"];
function Confetti({ streak }: { streak: number }) {
  const shouldReduceMotion = useReducedMotion();
  const particles = useMemo(() => {
    if (shouldReduceMotion) return [];
    // Reduced counts: less motion, one-shot celebration (capped to avoid jank on low-end)
    const count = streak === 0 ? 6 : streak >= 7 ? 12 : streak >= 3 ? 8 : 6;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      x: 5 + (i * 37) % 90,
      delay: (i % 7) * 0.08,
      duration: 2.2 + (i % 4) * 0.4,
      size: 6 + (i % 3) * 4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: (i * 47) % 360,
      shape: i % 3 === 0 ? "circle" : i % 3 === 1 ? "square" : "star",
    }));
  }, [streak, shouldReduceMotion]);

  if (shouldReduceMotion || particles.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0"
          style={{ left: `${p.x}%` }}
          initial={{ y: -24, opacity: 0, rotate: p.rotate }}
          animate={{ y: 420, opacity: [0, 1, 1, 0], rotate: p.rotate + 360 }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: 0,
            ease: "easeIn",
          }}
        >
          {p.shape === "circle" ? (
            <div style={{ width: p.size, height: p.size, background: p.color }} className="rounded-full shadow-sm" />
          ) : p.shape === "square" ? (
            <div style={{ width: p.size, height: p.size, background: p.color }} className="rounded-[2px] rotate-45 shadow-sm" />
          ) : (
            <Star style={{ width: p.size + 2, height: p.size + 2, color: p.color, fill: p.color }} className="drop-shadow-sm" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function EmberRise({ streak: _streak }: { streak: number }) {
  const shouldReduceMotion = useReducedMotion();
  if (shouldReduceMotion) return null;
  // Single run only — no infinite loop to avoid main-thread churn / jank
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute bottom-[38%] rounded-full"
          style={{
            left: `${22 + i * 9}%`,
            width: 3 + (i % 3) * 2,
            height: 3 + (i % 3) * 2,
            background: i % 2 === 0 ? "#fb923c" : "#facc15",
            boxShadow: "0 0 8px rgba(251,146,60,0.8)",
          }}
          initial={{ y: 0, opacity: 0, scale: 0.5 }}
          animate={{ y: -90 - (i % 3) * 20, opacity: [0, 0.8, 0], scale: [0.5, 1, 0] }}
          transition={{
            duration: 1.4 + (i % 3) * 0.3,
            delay: i * 0.18,
            repeat: 0,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default function StreakPopup({ open, streak, longestStreak = 0, displayName, onClose, onPrimaryAction, onExitComplete }: StreakPopupProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const m = getMilestone(streak, longestStreak);
  const Icon = m.icon;
  const shouldReduceMotion = useReducedMotion();
  const titleId = useId();
  const descId = useId();

  // Stable onClose ref to avoid effect thrash from inline arrow
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const onExitCompleteRef = useRef(onExitComplete);
  useEffect(() => {
    onExitCompleteRef.current = onExitComplete;
  }, [onExitComplete]);

  // Scroll lock via shared hook (ref-counted with drawer/command)
  useScrollLock(open, "streak-popup");

  // Focus + ESC + focus trap + inert background — portal to body so inert on appRoot doesn't freeze navigated page
  // Uses useLayoutEffect so inert removal happens before paint, same timing as scroll-lock.
  // Cleanup re-queries live DOM instead of captured node to heal leaks when navigate happened before cleanup.
  const inertCleanupRef = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    if (!open) return;

    const prev = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      // Simple focus trap: Tab loops inside modal
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey);

    // Apply inert to live shell — always set, remember we own it so we can force-remove even if leaked before
    const getInertTarget = (): HTMLElement | null =>
      document.querySelector<HTMLElement>("[data-keep-dark] > div.relative.flex") ??
      document.querySelector<HTMLElement>("main");

    const target = getInertTarget();
    const prevAriaHidden = target?.getAttribute("aria-hidden") ?? null;
    let weSetInert = false;
    let weSetAria = false;
    if (target) {
      // Always set inert; even if already present we take ownership to heal prior leak
      if (!target.hasAttribute("inert")) weSetInert = true;
      else weSetInert = true; // heal: we will still remove on close
      target.setAttribute("inert", "");
      if (target.getAttribute("aria-hidden") !== "true") {
        weSetAria = true;
        target.setAttribute("aria-hidden", "true");
      }
    }

    const cleanup = () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      // Re-query live target on cleanup — fixes captured-node leak when navigate happened before effect cleanup
      const live = getInertTarget();
      // Also heal any stale inert left on previously captured node or fallback main
      const candidates: (HTMLElement | null)[] = [
        live,
        document.querySelector<HTMLElement>("[data-keep-dark] > div.relative.flex"),
        document.querySelector<HTMLElement>("main"),
      ];
      const seen = new Set<HTMLElement>();
      for (const cand of candidates) {
        if (!cand || seen.has(cand)) continue;
        seen.add(cand);
        // Remove inert we set — force removal even if hadInert was true before (heals leak)
        if (weSetInert || cand.hasAttribute("inert")) {
          // Only remove if we set it or if it's the live shell that is currently inerted
          // Guard: don't strip inert from an element that was genuinely inert before popup if another overlay owns it
          // Heuristic: if cand is live shell, always clear inert (popup is the only inert owner for this shell)
          if (cand === live || weSetInert) cand.removeAttribute("inert");
        }
        if (weSetAria) {
          if (prevAriaHidden == null) cand.removeAttribute("aria-hidden");
          else cand.setAttribute("aria-hidden", prevAriaHidden);
        } else if (live === cand && cand.getAttribute("aria-hidden") === "true" && prevAriaHidden !== "true") {
          // Heal aria-hidden leak as well
          if (prevAriaHidden == null) cand.removeAttribute("aria-hidden");
          else cand.setAttribute("aria-hidden", prevAriaHidden);
        }
      }
      // Final safety: ensure no inert remains on any candidate if we owned it
      if (weSetInert) {
        for (const el of document.querySelectorAll<HTMLElement>("[inert]")) {
          // Only clear inert on app shell / main, not on unrelated inert subtrees (e.g. other dialogs)
          if (el.matches("[data-keep-dark] > div.relative.flex") || el.tagName.toLowerCase() === "main") {
            el.removeAttribute("inert");
          }
        }
      }
      // Restore focus only if still in document and not inside popup; use rAF to let navigate settle first
      if (prev && document.contains(prev) && !modalRef.current?.contains(prev)) {
        window.requestAnimationFrame(() => window.setTimeout(() => prev.focus?.(), 0));
      }
    };

    inertCleanupRef.current = cleanup;
    return cleanup;
  }, [open]);

  // Safety: on unmount, ensure inert is cleared even if effect cleanup was skipped (e.g. error boundary)
  useEffect(() => {
    return () => {
      inertCleanupRef.current?.();
      // Hard heal — if still inert, force clear
      const live = document.querySelector<HTMLElement>("[data-keep-dark] > div.relative.flex") ?? document.querySelector<HTMLElement>("main");
      if (live?.hasAttribute("inert")) live.removeAttribute("inert");
    };
  }, []);

  const greeting = useMemo(() => {
    if (displayName) return `Hey ${displayName.split(" ")[0]}!`;
    return streak === 0 ? "Welcome back!" : "Welcome back!";
  }, [displayName, streak]);

  const content = (
    <AnimatePresence
      mode="wait"
      onExitComplete={() => {
        if (!open) onExitCompleteRef.current?.();
      }}
    >
      {open && (
        <motion.div
          key="streak-popup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain"
          aria-modal="true"
          role="dialog"
          aria-labelledby={titleId}
          aria-describedby={descId}
          aria-label={`Streak ${streak} days`}
        >
          {/* Backdrop — lighter blur for streak 0 to reduce composite cost on low-end */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.08 : 0.15 }}
            className={`fixed inset-0 ${streak === 0 ? "bg-[#070708]/75 backdrop-blur-[8px]" : "bg-[#070708]/80 backdrop-blur-[10px] md:backdrop-blur-[12px]"}`}
            onClick={() => onCloseRef.current()}
            aria-hidden="true"
          />
          {/* Aurora orbs behind modal */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            <div className={`absolute left-1/2 top-1/2 h-[520px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br ${m.gradient} blur-3xl opacity-80`} />
            <div className="absolute left-1/2 top-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(56,177,255,0.08),transparent_70%)] blur-2xl" />
          </div>

          {/* Modal — outer shell clips rounded corners, inner scrolls */}
          <motion.div
            ref={modalRef}
            initial={shouldReduceMotion ? { opacity: 0, y: 12 } : { opacity: 0, scale: 0.92, y: 20 }}
            animate={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={shouldReduceMotion ? { opacity: 0, y: 10 } : { opacity: 0, scale: 0.96, y: 16 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.2, ease: "easeOut" }
                : { type: "spring", stiffness: 380, damping: 28, mass: 0.9 }
            }
            className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0f0f10] shadow-[0_24px_64px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)_inset] max-h-[min(92dvh,720px)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top shimmer border */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />

            {/* Scrollable content */}
            <div className="relative overflow-y-auto overscroll-contain no-scrollbar flex-1">
              {/* Confetti — behind close button but above background (reduced blur for streak 0) */}
              <Confetti streak={streak} />

              {/* Header — Flame hero */}
              <div className="relative px-6 pb-2 pt-7 text-center">
                {/* Glow behind flame — lighter blur for streak 0 */}
                <motion.div
                  className={`absolute left-1/2 top-[46px] h-[140px] w-[200px] -translate-x-1/2 rounded-full bg-gradient-to-br ${m.gradient} ${streak === 0 ? "blur-xl opacity-60" : "blur-2xl"}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                />
                <EmberRise streak={streak} />

                {/* Flame orb */}
                <motion.div
                  className="relative mx-auto flex h-[92px] w-[92px] items-center justify-center"
                  initial={shouldReduceMotion ? { scale: 1, opacity: 1 } : { scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={
                    shouldReduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 420, damping: 18, delay: 0.12 }
                  }
                >
                  {/* Outer glow ring */}
                  <motion.div
                    className={`absolute inset-0 rounded-[28px] bg-gradient-to-br ${m.accent} opacity-20 blur-xl`}
                    animate={shouldReduceMotion ? {} : { scale: [1, 1.06, 1], opacity: [0.18, 0.26, 0.18] }}
                    transition={shouldReduceMotion ? {} : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10"
                    animate={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={shouldReduceMotion ? {} : { duration: 12, repeat: Infinity, ease: "linear" }}
                    style={{ borderRadius: 26 }}
                  />
                  <div className={`relative flex h-[84px] w-[84px] items-center justify-center rounded-[22px] bg-gradient-to-br ${m.accent} shadow-[0_12px_32px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.14)_inset]`}>
                    <motion.div
                      animate={
                        shouldReduceMotion
                          ? {}
                          : streak === 0
                            ? { scale: [1, 1.04, 1] }
                            : { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }
                      }
                      transition={
                        shouldReduceMotion
                          ? {}
                          : streak === 0
                            ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }
                      }
                      className="relative"
                    >
                      <Icon className="h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]" />
                      {streak > 0 && (
                        <motion.div
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-zinc-900 shadow"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.5 }}
                        >
                          {streak}
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                  {/* Sparkle accents */}
                  <motion.div
                    className="absolute -right-1 top-1 text-amber-300"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45, type: "spring", stiffness: 400 }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </motion.div>
                  <motion.div
                    className="absolute -left-1 bottom-1 text-white/70"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.9 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 400 }}
                  >
                    <Star className="h-3 w-3" />
                  </motion.div>
                </motion.div>

                {/* Greeting */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300"
                >
                  {greeting} • {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                </motion.p>

                {/* Streak number — hero */}
                <div className="relative mt-2">
                  {streak === 0 ? (
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, type: "spring", stiffness: 300 }}
                      className="bg-gradient-to-r from-zinc-200 via-white to-zinc-400 bg-clip-text text-[28px] font-bold leading-none tracking-tight text-transparent"
                    >
                      Start your chain today
                    </motion.h2>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <motion.span
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.26, type: "spring", stiffness: 380, damping: 16 }}
                        className={`bg-gradient-to-r ${m.accent} bg-clip-text text-[56px] font-black leading-none tracking-tighter text-transparent drop-shadow-sm`}
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {streak}
                      </motion.span>
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-[22px] font-bold tracking-tight text-transparent"
                      >
                        day streak
                      </motion.span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
                        className="ml-1 inline-flex"
                      >
                        <Flame className="h-6 w-6 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                      </motion.span>
                    </div>
                  )}
                  {streak > 0 && longestStreak > 0 && streak < longestStreak && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      className="mt-1 text-xs text-zinc-500"
                    >
                      Longest: <span className="font-semibold text-zinc-300">{longestStreak} days</span> • {longestStreak - streak} to beat it
                    </motion.p>
                  )}
                  {streak > 0 && streak >= longestStreak && streak > 1 && longestStreak > 0 && (
                    <motion.p
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.45, type: "spring" }}
                      className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20"
                    >
                      <Crown className="h-3 w-3" /> New personal best!
                    </motion.p>
                  )}
                </div>

                {/* Title & subtitle */}
                <motion.h3
                  id={titleId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                  className="mt-3 text-[15px] font-semibold leading-tight text-white"
                >
                  {m.title}
                </motion.h3>
                <motion.p
                  id={descId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                  className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-zinc-400"
                >
                  {m.subtitle}
                </motion.p>
              </div>

              {/* 7-day chain */}
              <div className="relative px-6 pt-5">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">7-day chain</p>
                    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${m.accent} px-2.5 py-1 text-[11px] font-bold text-white shadow`}>
                      <Flame className="h-3 w-3" /> {streak} days
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const filledCount = Math.min(7, streak === 0 ? 0 : streak % 7 === 0 ? 7 : streak % 7);
                      const idxFromEnd = 6 - i;
                      const isFilled = idxFromEnd < filledCount;
                      const isToday = i === 6;
                      const showTodayPulse = streak > 0 && !isFilled && isToday && filledCount < 7;
                      return (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4 + i * 0.05, type: "spring", stiffness: 350 }}
                          className={`relative flex h-[44px] flex-col items-center justify-center rounded-xl border text-[11px] font-bold transition ${
                            isFilled
                              ? `border-amber-500/30 bg-gradient-to-br ${m.accent} text-white shadow-[0_4px_16px_rgba(245,158,11,0.25)]`
                              : showTodayPulse
                                ? "border-white/15 bg-white/[0.06] text-zinc-300 animate-pulse"
                                : "border-white/10 bg-white/[0.03] text-zinc-600"
                          }`}
                        >
                          {isFilled ? (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.5 + i * 0.04, type: "spring", stiffness: 500 }}
                              className="text-[13px]"
                            >
                              ✓
                            </motion.span>
                          ) : (
                            <span className="text-[14px] leading-none">·</span>
                          )}
                          <span className="mt-0.5 text-[9px] font-medium tracking-wide opacity-70">
                            {isToday ? "Today" : `D${i + 1}`}
                          </span>
                          {isFilled && (
                            <motion.div
                              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.6 + i * 0.04 }}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-[11px] text-zinc-500">
                    {streak === 0
                      ? "Complete any task today to light the first box"
                      : streak >= 7
                        ? "Don't break the chain — come back tomorrow"
                        : `${7 - (streak % 7 || 7)} more to fill the week • Keep going`}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 px-6 pt-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Current</p>
                  <p className="mt-1 text-lg font-bold text-white">{streak}</p>
                  <p className="text-[11px] text-zinc-500">days</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300">Longest</p>
                  <p className="mt-1 text-lg font-bold text-white">{Math.max(streak, longestStreak)}</p>
                  <p className="text-[11px] text-amber-200/70">record</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Next</p>
                  <p className="mt-1 text-lg font-bold text-white">{streak === 0 ? "1" : streak + 1}</p>
                  <p className="text-[11px] text-zinc-500">goal</p>
                </div>
              </div>

              {/* CTA — single close path: onPrimaryAction already closes + navigates, avoid double setStreakOpen */}
              <div className="px-6 pb-6 pt-4">
                <motion.button
                  type="button"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.015 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.985 }}
                  onClick={() => {
                    if (onPrimaryAction) onPrimaryAction();
                    else onCloseRef.current();
                  }}
                  className={`flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r ${streak === 0 ? "from-zinc-800 to-zinc-700 ring-1 ring-white/10" : m.accent} px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition`}
                >
                  {streak === 0 ? (
                    <>
                      <Rocket className="h-4 w-4" /> Start my streak
                    </>
                  ) : streak >= 7 ? (
                    <>
                      <Crown className="h-4 w-4" /> Keep the crown <ChevronRight className="h-4 w-4 opacity-70" />
                    </>
                  ) : (
                    <>
                      <Flame className="h-4 w-4" /> Keep it burning <ChevronRight className="h-4 w-4 opacity-70" />
                    </>
                  )}
                </motion.button>
                <button
                  type="button"
                  onClick={() => onCloseRef.current()}
                  className="mx-auto mt-2.5 block text-xs font-medium text-zinc-500 hover:text-zinc-300 transition"
                >
                  Continue to dashboard
                </button>
                {streak >= 3 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600"
                  >
                    Tip: Your streak is built on completed tasks. Even one small win today keeps it alive. 🔥
                  </motion.p>
                )}
              </div>

              {/* Bottom glow */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Close — guaranteed on top, 44px hit target on mobile */}
            <button
              ref={closeRef}
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close streak popup"
              className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/15 active:bg-white/20 transition md:h-8 md:w-8 pointer-events-auto"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  // Portal outside [data-keep-dark] so inert on app shell never freezes navigated page
  return createPortal(content, document.body);
}
