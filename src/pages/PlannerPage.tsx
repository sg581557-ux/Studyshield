import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchTodayPlan, toggleTaskComplete } from "../lib/aiPlanner";
import type { PlanTask, AiPlan } from "../lib/supabase";
import { cn, formatTime, minutesToHours, priorityColor } from "../lib/utils";
import { Clock, CheckCircle2, Circle, Coffee, BookOpen, RotateCw, FileQuestion, Sparkles, TrendingUp } from "lucide-react";

const TYPE_ICONS: Record<string, typeof Clock> = {
  study: BookOpen,
  practice: FileQuestion,
  revision: RotateCw,
  break: Coffee,
  test: TrendingUp,
};

export default function PlannerPage() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session?.user?.id) return;
    const { plan, tasks } = await fetchTodayPlan(session.user.id);
    setPlan(plan);
    setTasks(tasks);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session]);

  const handleToggle = async (taskId: string, completed: boolean) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed } : t));
    await toggleTaskComplete(taskId, completed);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No plan for today</h2>
        <p className="text-slate-500 mb-6">Head to the AI Planner to generate one</p>
        <a href="/planner" className="btn-primary">
          <Sparkles className="w-4 h-4" /> Go to AI Planner
        </a>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.completed && t.type !== "break").length;
  const totalCount = tasks.filter((t) => t.type !== "break").length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalMinutes = tasks.filter((t) => t.type !== "break").reduce((sum, t) => sum + t.estimated_minutes, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Today's Plan</h1>
          <p className="text-slate-500 mt-1">
            {plan?.today_goal && `Goal: ${plan.today_goal} · `}
            {minutesToHours(totalMinutes)} of planned study
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{pct}%</p>
            <p className="text-xs text-slate-500">{completedCount}/{totalCount} done</p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24" fill="none" stroke="#2d7ff0" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-4 lg:p-6">
        <div className="relative">
          <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-slate-200" />
          <div className="space-y-1">
            {tasks.map((task) => {
              const Icon = TYPE_ICONS[task.type] ?? Clock;
              const isBreak = task.type === "break";
              return (
                <div
                  key={task.id}
                  className={cn(
                    "relative flex items-start gap-4 py-3 px-3 rounded-xl transition-colors",
                    !isBreak && "hover:bg-slate-50 cursor-pointer",
                    task.completed && "opacity-60"
                  )}
                  onClick={() => !isBreak && handleToggle(task.id, !task.completed)}
                >
                  <div className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 border-2",
                    isBreak
                      ? "bg-slate-100 border-slate-200"
                      : task.completed
                        ? "bg-accent-500 border-accent-500"
                        : "bg-white border-slate-200"
                  )}>
                    {isBreak ? (
                      <Icon className="w-5 h-5 text-slate-400" />
                    ) : task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        "text-sm font-medium",
                        task.completed ? "text-slate-400 line-through" : "text-slate-900"
                      )}>
                        {task.title}
                      </p>
                      {!isBreak && (
                        <span className={cn("badge capitalize", priorityColor(task.priority))}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(task.start_time)} - {formatTime(task.end_time)}
                      </span>
                      <span>{minutesToHours(task.estimated_minutes)}</span>
                      {task.subject && <span className="text-slate-500">{task.subject}</span>}
                      {task.source && <span className="badge bg-slate-100 text-slate-500">{task.source}</span>}
                    </div>
                  </div>

                  {!isBreak && (
                    <button
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-2 transition-all",
                        task.completed ? "bg-accent-500 border-accent-500" : "border-slate-300 hover:border-brand-400"
                      )}
                    >
                      {task.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
