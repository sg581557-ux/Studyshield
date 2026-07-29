import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { generateDailyPlan, fetchTodayPlan, deletePlanTasks } from "../lib/aiPlanner";
import { cn } from "../lib/utils";
import { Sparkles, Clock, Target, Zap, Check, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

const MODES = [
  { id: "balanced", label: "Balanced", desc: "Steady pace with regular breaks", icon: Check },
  { id: "hard_push", label: "Hard Push", desc: "Longer sessions, intense focus", icon: Zap },
  { id: "recovery", label: "Recovery", desc: "Lighter load, catch up gradually", icon: Clock },
  { id: "exam_sprint", label: "Exam Sprint", desc: "Max practice, minimal breaks", icon: Target },
] as const;

const GOAL_SUGGESTIONS = [
  "Complete 3 Lectures",
  "Finish 2 Chapters",
  "Solve 50 Practice Questions",
  "Revise 3 Weak Chapters",
  "Complete 1 Mock Test",
];

export default function AIPlanner() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const [hours, setHours] = useState(Number(profile?.daily_goal_hours) || 4);
  const [mode, setMode] = useState(profile?.study_mode || "balanced");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasPlan, setHasPlan] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchTodayPlan(session.user.id).then(({ tasks }) => {
      setHasPlan(tasks.length > 0);
      setChecking(false);
    });
  }, [session]);

  const handleGenerate = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    setError("");
    try {
      await deletePlanTasks(session.user.id);
      await generateDailyPlan(session.user.id, {
        availableHours: hours,
        mode: mode as "balanced" | "hard_push" | "recovery" | "exam_sprint",
        todayGoal: goal || GOAL_SUGGESTIONS[0],
        exam: profile?.target_exam || "",
      });
      navigate("/planner/today");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-brand-600" />
          <h1 className="text-2xl font-bold text-slate-900">AI Planner</h1>
        </div>
        <p className="text-slate-500">Generate a personalized study plan for today</p>
      </div>

      {hasPlan && (
        <div className="card p-4 border-brand-200 bg-brand-50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-brand-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-900">You already have a plan for today</p>
            <p className="text-xs text-brand-700">Generating a new one will replace it</p>
          </div>
          <button onClick={() => navigate("/planner/today")} className="btn-secondary text-sm">
            View <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="card p-6 space-y-6">
        {/* Goal */}
        <div>
          <label className="label">What's your main goal today?</label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="input"
            placeholder="e.g., Complete 3 Lectures"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {GOAL_SUGGESTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  goal === g ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Available hours */}
        <div>
          <label className="label">Available time: {hours} hours</label>
          <input
            type="range"
            min="1"
            max="14"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1h</span><span>7h</span><span>14h</span>
          </div>
        </div>

        {/* Study mode */}
        <div>
          <label className="label">Study mode</label>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3",
                  mode === m.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center",
                  mode === m.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <m.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm text-error-600 bg-error-50 border border-error-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating your plan...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate AI Plan</>
          )}
        </button>
      </div>
    </div>
  );
}
