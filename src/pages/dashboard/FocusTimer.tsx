import { useCallback, useEffect, useRef, useState } from "react";
import { Timer as TimerIcon, Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button } from "../../components/ui";
import { FOCUS_MODES, formatTimer } from "../../lib/constants";

type Phase = "work" | "short" | "long";

export default function FocusTimer() {
  const { toast } = useToast();
  const [modeId, setModeId] = useState("pomodoro");
  const mode = FOCUS_MODES.find((m) => m.id === modeId)!;
  const [phase, setPhase] = useState<Phase>("work");
  const [remaining, setRemaining] = useState(mode.work * 60);
  const [running, setRunning] = useState(false);
  const [cyclesDone, setCyclesDone] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const currentDuration = (phase === "work" ? mode.work : phase === "short" ? mode.shortBreak : mode.longBreak) * 60;

  // Resetting the timer when the mode changes is "adjusting state when a
  // prop changes" (React docs pattern): done during render so the new
  // duration is committed atomically instead of cascading from an effect.
  const [prevModeId, setPrevModeId] = useState(modeId);
  if (prevModeId !== modeId) {
    setPrevModeId(modeId);
    if (!running) setRemaining(currentDuration);
  }

  const handleComplete = useCallback(() => {
    setRunning(false);
    if (phase === "work") {
      const next = cyclesDone + 1;
      setCyclesDone(next);
      db.addFocusSession(mode.work, true).catch((e) => console.error("[timer] addFocusSession threw", e));
      toast.success(`Work session done! +${mode.work * 2} XP`);
      const isLong = next % mode.cycles === 0;
      setPhase(isLong ? "long" : "short");
      setRemaining((isLong ? mode.longBreak : mode.shortBreak) * 60);
    } else {
      setPhase("work"); setRemaining(mode.work * 60); toast.info("Break over — back to work");
    }
  }, [phase, cyclesDone, mode, toast]);

  useEffect(() => {
    if (!running) { if (intervalRef.current) window.clearInterval(intervalRef.current); return; }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { handleComplete(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [running, handleComplete]);

  function reset() { setRunning(false); setPhase("work"); setRemaining(mode.work * 60); setCyclesDone(0); }
  const total = currentDuration;
  const pct = Math.round(((total - remaining) / total) * 100);
  const phaseLabel = phase === "work" ? "Focus" : phase === "short" ? "Short break" : "Long break";

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2"><TimerIcon className="w-5 h-5 text-accent-600 dark:text-accent-400" /> Focus Timer</h1><p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Stay focused with structured work sessions.</p></div>
      <Card><CardBody className="flex flex-col items-center gap-6 py-8">
        <div className="flex gap-2">{FOCUS_MODES.map((m) => <button key={m.id} onClick={() => { setModeId(m.id); setPhase("work"); setCyclesDone(0); }} className={`rounded-full px-3 py-1.5 text-xs ${m.id === modeId ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400"}`}>{m.label}</button>)}</div>
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-accent-600 dark:text-accent-400" strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`} style={{ transition: "stroke-dashoffset 0.5s linear" }} />
          </svg>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums" role="timer">{formatTimer(remaining)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{phaseLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setRunning((r) => !r)}>{running ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}</Button>
          <Button variant="ghost" onClick={reset}><RotateCcw className="w-4 h-4" /> Reset</Button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Cycle {cyclesDone % mode.cycles === 0 && cyclesDone > 0 ? mode.cycles : cyclesDone % mode.cycles} / {mode.cycles}</p>
      </CardBody></Card>
    </div>
  );
}
