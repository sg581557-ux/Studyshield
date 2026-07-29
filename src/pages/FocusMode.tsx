import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cn, minutesToHours } from "../lib/utils";
import { Timer, Play, Pause, Square, Clock, Zap } from "lucide-react";

const PRESETS = [
  { mode: "25/5", study: 25, break: 5, label: "Pomodoro" },
  { mode: "50/10", study: 50, break: 10, label: "Deep Work" },
  { mode: "90/20", study: 90, break: 20, label: "Flow State" },
];

export default function FocusMode() {
  const { session } = useAuth();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].study * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadTodaySessions();
  }, [session]);

  const loadTodaySessions = async () => {
    if (!session?.user?.id) return;
    const today = new Date().toDateString();
    const { data } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("completed", true);
    const todayMin = (data ?? [])
      .filter((s: { started_at: string; duration_minutes: number }) => new Date(s.started_at).toDateString() === today)
      .reduce((sum: number, s: { duration_minutes: number }) => sum + s.duration_minutes, 0);
    setTodayMinutes(todayMin);
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleStart = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: session.user.id,
        duration_minutes: isBreak ? preset.break : preset.study,
        completed: false,
        strict_mode: false,
      })
      .select()
      .single();
    sessionIdRef.current = data?.id ?? null;
    setIsRunning(true);
  };

  const handleComplete = async () => {
    setIsRunning(false);
    if (sessionIdRef.current && session?.user?.id) {
      await supabase
        .from("focus_sessions")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
      sessionIdRef.current = null;
    }
    if (isBreak) {
      setIsBreak(false);
      setSecondsLeft(preset.study * 60);
    } else {
      setCompletedRounds((r) => r + 1);
      setIsBreak(true);
      setSecondsLeft(preset.break * 60);
      setTodayMinutes((m) => m + preset.study);
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (sessionIdRef.current && session?.user?.id) {
      await supabase
        .from("focus_sessions")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", sessionIdRef.current);
      sessionIdRef.current = null;
    }
    setIsBreak(false);
    setSecondsLeft(preset.study * 60);
  };

  const switchPreset = (p: typeof PRESETS[0]) => {
    setPreset(p);
    setSecondsLeft(p.study * 60);
    setIsBreak(false);
    setIsRunning(false);
  };

  const totalSec = (isBreak ? preset.break : preset.study) * 60;
  const pct = ((totalSec - secondsLeft) / totalSec) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
          <Timer className="w-6 h-6 text-brand-600" /> Focus Mode
        </h1>
        <p className="text-slate-500 mt-1">Stay focused with timed study sessions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <Clock className="w-5 h-5 text-brand-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900">{minutesToHours(todayMinutes)}</p>
          <p className="text-xs text-slate-500">Today</p>
        </div>
        <div className="card p-4 text-center">
          <Zap className="w-5 h-5 text-accent-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900">{completedRounds}</p>
          <p className="text-xs text-slate-500">Rounds</p>
        </div>
        <div className="card p-4 text-center">
          <Timer className="w-5 h-5 text-warning-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-slate-900">{preset.label}</p>
          <p className="text-xs text-slate-500">Mode</p>
        </div>
      </div>

      {/* Timer */}
      <div className="card p-8 flex flex-col items-center">
        <div className="flex gap-2 mb-8">
          {PRESETS.map((p) => (
            <button
              key={p.mode}
              onClick={() => switchPreset(p)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                preset.mode === p.mode ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {p.label} ({p.study}/{p.break})
            </button>
          ))}
        </div>

        <div className="relative w-64 h-64 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            <circle cx="128" cy="128" r="120" fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="128" cy="128" r="120" fill="none"
              stroke={isBreak ? "#10b981" : "#2d7ff0"}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 120}`}
              strokeDashoffset={`${2 * Math.PI * 120 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold text-slate-900 tabular-nums">
              {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
            </p>
            <p className={cn("text-sm font-medium mt-2", isBreak ? "text-accent-600" : "text-brand-600")}>
              {isBreak ? "Break" : "Focus"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button onClick={handleStart} className="btn-primary">
              <Play className="w-5 h-5" /> Start
            </button>
          ) : (
            <button onClick={() => setIsRunning(false)} className="btn-secondary">
              <Pause className="w-5 h-5" /> Pause
            </button>
          )}
          <button onClick={handleStop} className="btn-ghost">
            <Square className="w-5 h-5" /> Stop
          </button>
        </div>
      </div>
    </div>
  );
}
