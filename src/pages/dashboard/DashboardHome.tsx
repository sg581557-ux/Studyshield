import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Flame, Clock, ArrowRight, CircleCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/db";
import { Card, CardBody, ProgressBar, ProgressRing } from "../../components/ui";
import MentorCheckinCard from "../../components/MentorCheckinCard";
import { levelFromXP, minutesToHM, todayISODate } from "../../lib/constants";
import type { PlanTask } from "../../lib/types";

function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const { profile, user, loading: authLoading } = useAuth();
  const [today, setToday] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { db.getTasksForDate(todayISODate()).then(setToday).catch(() => setToday([])).finally(() => setLoading(false)); }, []);

  const greeting = useGreeting();
  const emailName = user?.email ? user.email.split("@")[0].replace(/[._-]/g, " ") : "";
  const name = authLoading ? "…" : (profile?.display_name || profile?.full_name || emailName || "there");
  const lvl = levelFromXP(profile?.xp ?? 0);
  const done = today.filter((t) => t.completed).length;
  const totalMin = today.reduce((a, t) => a + t.estimated_minutes, 0);
  const completionPct = today.length ? Math.round((done / today.length) * 100) : 0;
  const xpToNext = lvl.needed - lvl.current;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600/15 via-transparent to-transparent pointer-events-none" />
        <CardBody className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">{greeting}</p>
            <h1 className="text-xl font-semibold text-white truncate">{name}</h1>
            <p className="text-sm text-slate-500 mt-1">Here's your study snapshot for today.</p>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-sm text-warning-400">
                <Flame className="w-4 h-4" /> {profile?.longest_streak ?? 0} day streak
              </div>
              <div className="flex items-center gap-1.5 text-sm text-success-400">
                <Clock className="w-4 h-4" /> {minutesToHM(totalMin)} planned today
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <ProgressRing
              value={lvl.pct}
              size={76}
              strokeWidth={6}
              label={
                <div className="text-center leading-none">
                  <p className="text-[9px] tracking-wide text-slate-500 mb-1">LEVEL</p>
                  <p className="text-xl font-bold text-white">{lvl.level}</p>
                </div>
              }
            />
            <div className="text-xs">
              <p className="text-sm font-semibold text-accent-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {profile?.xp ?? 0} XP
              </p>
              <p className="text-slate-500 mt-0.5">{xpToNext} XP to level {lvl.level + 1}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Mentor daily check-in */}
      <MentorCheckinCard />

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-white">{done}<span className="text-slate-600 text-base">/{today.length}</span></p>
            <p className="text-xs text-slate-500 mt-1">Tasks done</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-white">{completionPct}%</p>
            <p className="text-xs text-slate-500 mt-1">Completion</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center py-4">
            <p className="text-2xl font-bold text-white">{minutesToHM(totalMin)}</p>
            <p className="text-xs text-slate-500 mt-1">Planned time</p>
          </CardBody>
        </Card>
      </div>

      {/* Today's plan */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Today's plan</h3>
            <Link to="/planner" className="text-xs text-accent-400 hover:underline flex items-center gap-1">
              Open planner <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : today.length === 0 ? (
            <div className="text-center py-8">
              <CircleCheck className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No tasks yet for today.</p>
              <Link to="/planner" className="inline-flex items-center gap-1 mt-3 text-xs text-accent-400 hover:underline">
                Generate a plan <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <>
              <ProgressBar value={completionPct} />
              <p className="text-xs text-slate-500">{done}/{today.length} tasks · {completionPct}%</p>
              <div className="space-y-1.5">
                {today.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center gap-3 text-sm rounded-xl px-3 py-2 transition-colors ${t.completed ? "bg-white/[0.02]" : "bg-white/5"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.completed ? "bg-success-500" : "bg-accent-500"}`} />
                    <span className={`flex-1 truncate ${t.completed ? "text-slate-600 line-through" : "text-slate-300"}`}>{t.title}</span>
                    {t.subject && (
                      <span className="hidden sm:inline text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full shrink-0">{t.subject}</span>
                    )}
                    <span className="text-xs text-slate-600 shrink-0">{minutesToHM(t.estimated_minutes)}</span>
                  </div>
                ))}
              </div>
              {today.length > 6 && (
                <Link to="/planner" className="block text-center text-xs text-accent-400 hover:underline pt-1">
                  +{today.length - 6} more tasks
                </Link>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}