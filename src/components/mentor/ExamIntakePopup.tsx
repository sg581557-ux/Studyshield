import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Clock, Brain, ChevronRight, Check } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ExamIntakeValue {
  coverage: "not_started" | "half" | "almost" | "revision" | null;
  weakChapters: string[];
  weakText: string;
  hours: 4 | 6 | 8 | null;
}

interface Props {
  open: boolean;
  examInfo: { subject: string; examLabel: string; examISO: string; beforeISO: string; beforeLabel: string } | null;
  onClose: () => void;
  onConfirm: (value: ExamIntakeValue) => void;
  busy?: boolean;
}

const COVERAGE_OPTIONS: { value: ExamIntakeValue["coverage"]; label: string; desc: string }[] = [
  { value: "not_started", label: "Not started", desc: "Haven't touched it" },
  { value: "half", label: "Half syllabus", desc: "~50% done" },
  { value: "almost", label: "Almost done", desc: "80%+ done" },
  { value: "revision", label: "Only revision", desc: "Syllabus done" },
];

const HOURS_OPTIONS: { value: 4 | 6 | 8; label: string; desc: string }[] = [
  { value: 4, label: "4h", desc: "Light" },
  { value: 6, label: "6h", desc: "Standard" },
  { value: 8, label: "8h", desc: "Intensive" },
];

const WEAK_CHIPS = ["Networks", "OS", "DBMS", "Programming", "All good"];

export default function ExamIntakePopup({ open, examInfo, onClose, onConfirm, busy }: Props) {
  const [coverage, setCoverage] = useState<ExamIntakeValue["coverage"]>(null);
  const [weakChapters, setWeakChapters] = useState<string[]>([]);
  const [weakText, setWeakText] = useState("");
  const [hours, setHours] = useState<4 | 6 | 8 | null>(null);

  const isValid = coverage !== null && hours !== null;

  useEffect(() => {
    if (open) {
      setCoverage(null);
      setWeakChapters([]);
      setWeakText("");
      setHours(null);
    }
  }, [open]);

  const toggleWeak = (chip: string) => {
    if (chip === "All good") {
      setWeakChapters([]);
      setWeakText("");
      return;
    }
    setWeakChapters((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({ coverage, weakChapters, weakText: weakText.trim(), hours });
  };

  const handleSkip = () => {
    // Use sensible defaults — still regenerates the day so user sees a plan update
    onConfirm({ coverage: "half", weakChapters: [], weakText: "", hours: 6 });
  };

  const beforeLabel = useMemo(() => {
    if (!examInfo?.beforeISO) return "";
    try {
      return new Date(`${examInfo.beforeISO}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" });
    } catch {
      return examInfo.beforeISO;
    }
  }, [examInfo]);

  return (
    <AnimatePresence>
      {open && examInfo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Exam preparation questions"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.97, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-accent-600/20 via-accent-600/10 to-transparent px-5 py-4">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/10 to-transparent" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm font-semibold text-white">Let's tailor your plan</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">3 steps</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    <span className="font-medium text-white">{examInfo.subject} {examInfo.examLabel}</span> on <span className="font-medium text-white">{examInfo.examISO}</span> — day before is <span className="font-medium text-white">{beforeLabel}</span>. I’ll regenerate that day for you.
                  </p>
                </div>
                <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-1">
                <span className={cn("h-1 flex-1 rounded-full", coverage ? "bg-accent-500" : "bg-white/10")} />
                <span className={cn("h-1 flex-1 rounded-full", weakChapters.length > 0 || weakText ? "bg-accent-500" : "bg-white/10")} />
                <span className={cn("h-1 flex-1 rounded-full", hours ? "bg-accent-500" : "bg-white/10")} />
              </div>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-5">
              {/* Q1 */}
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-600/20 text-[11px] font-bold text-accent-400">1</span>
                  How much have you studied?
                  {coverage && <Check className="h-3.5 w-3.5 text-success-400" />}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {COVERAGE_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setCoverage(o.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition-all",
                        coverage === o.value
                          ? "border-accent-500 bg-accent-600/15 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/15 hover:bg-white/10"
                      )}
                    >
                      <p className="text-sm font-medium">{o.label}</p>
                      <p className="text-[11px] text-slate-500">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-600/20 text-[11px] font-bold text-accent-400">2</span>
                  Which chapters feel weak? <span className="text-[10px] font-normal normal-case text-slate-500">(optional)</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {WEAK_CHIPS.map((chip) => {
                    const active = weakChapters.includes(chip) || (chip === "All good" && weakChapters.length === 0 && !weakText);
                    return (
                      <button
                        key={chip}
                        onClick={() => toggleWeak(chip)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={weakText}
                  onChange={(e) => setWeakText(e.target.value)}
                  placeholder="Or type e.g. 'Networks, OS' or 'all good'"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent-500/50 focus:outline-none"
                />
              </div>

              {/* Q3 */}
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-600/20 text-[11px] font-bold text-accent-400">3</span>
                  Hours on {beforeLabel}? <Clock className="h-3 w-3 text-slate-500" />
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {HOURS_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setHours(o.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-center transition-all",
                        hours === o.value ? "border-accent-500 bg-accent-600 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <p className="text-sm font-bold">{o.label}</p>
                      <p className="text-[11px] opacity-70">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-accent-600/10 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
                <Brain className="h-3.5 w-3.5 shrink-0 text-accent-400" />
                I’ll regenerate <span className="font-medium text-white">{beforeLabel}</span> whole day (exam tomorrow) + add your weak chapters. You can Undo after.
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 bg-ink-950/50 p-3">
              <button
                onClick={handleSkip}
                disabled={!!busy}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                Skip — use defaults
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid || !!busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent-600 py-2.5 text-sm font-semibold text-white hover:bg-accent-500 disabled:opacity-40"
              >
                {busy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Updating…
                  </>
                ) : (
                  <>
                    Start Planning <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
