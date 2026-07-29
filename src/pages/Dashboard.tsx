import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock, Flame, Target, TrendingUp, CheckCircle2, Circle,
  Play, BookOpen, AlertCircle, Calendar, Plus, Trophy,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { storage, uid } from "../lib/storage";
import { Card, CardBody, ProgressRing, EmptyState, Button } from "../components/ui";
import { cn, minutesToHM, formatRelative } from "../lib/utils";
import type { PlanTask, Chapter, MockTest } from "../lib/types";

const TASK_TYPE_STYLES: Record<PlanTask["type"], string> = {
  study: "bg-accent-600/15 text-accent-300 border-accent-500/20",
  practice: "bg-warning-600/15 text-warning-300 border-warning-500/20",
  revision: "bg-success-600/15 text-success-300 border-success-500/20",
  break: "bg-slate-600/15 text-slate-300 border-slate-500/20",
  test: "bg-danger-600/15 text-danger-300 border-danger-500/20",
};

export function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PlanTask[]>(() => storage.getTasks());
  const [chapters, setChapters] = useState<Chapter[]>(() => storage.getChapters());
  const focusSessions = useMemo(() => storage.getFocusSessions(), []);
  const mocks = useMemo(() => storage.getMocks(), []);

  const studyTasks = tasks.filter((t) => t.type !== "break");
  const completedTasks = studyTasks.filter((t) => t.completed).length;
  const totalStudyTasks = studyTasks.length;
  const dayProgress = totalStudyTasks > 0 ? (completedTasks / totalStudyTasks) * 100 : 0;

  const syllabusProgress =
    chapters.length > 0
      ? chapters.reduce((sum, c) => sum + c.progress, 0) / chapters.length
      : 0;

  const todayMinutes = focusSessions
    .filter((s) => {
      const d = new Date(s.startedAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  const streak = focusSessions.length;
  const goalMinutes = (user?.dailyGoalHours || 6) * 60;

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    storage.setTasks(updated);
  };

  const addQuickTask = () => {
    const newTask: PlanTask = {
      id: uid(),
      title: "New study session",
      subject: "General",
      type: "study",
      estimatedMinutes: 45,
      priority: "medium",
      completed: false,
      startTime: "—",
      endTime: "—",
      chapter: null,
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    storage.setTasks(updated);
  };

  const addQuickChapter = () => {
    const newChapter: Chapter = {
      id: uid(),
      subject: "General",
      name: "New chapter",
      status: "not_started",
      progress: 0,
      lecturesRemaining: 0,
      questionsRemaining: 0,
      confidence: 1,
    };
    const updated = [...chapters, newChapter];
    setChapters(updated);
    storage.setChapters(updated);
  };

  const upcomingTasks = tasks.filter((t) => !t.completed).slice(0, 4);
  const recentMocks = [...mocks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const weakChapters = chapters.filter((c) => c.status !== "completed" && c.confidence <= 2).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Welcome, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="mt-1 text-slate-400">
          {user?.exam}
          {totalStudyTasks > 0 && ` · ${completedTasks} of ${totalStudyTasks} tasks done today`}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Today's focus" value={minutesToHM(todayMinutes)} sub={`of ${minutesToHM(goalMinutes)}`} color="accent" />
        <StatCard icon={Flame} label="Sessions" value={`${streak}`} sub={streak === 1 ? "session logged" : "sessions logged"} color="warning" />
        <StatCard icon={Target} label="Syllabus done" value={chapters.length > 0 ? `${Math.round(syllabusProgress)}%` : "—"} sub={`${chapters.length} chapter${chapters.length === 1 ? "" : "s"}`} color="success" />
        <StatCard icon={TrendingUp} label="Last mock" value={recentMocks[0] ? `${Math.round((recentMocks[0].obtainedMarks / recentMocks[0].totalMarks) * 100)}%` : "—"} sub={recentMocks[0]?.testName || "No mocks yet"} color="accent" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-white">Today's plan</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {totalStudyTasks === 0 ? "No tasks yet — add your first one" : `${totalStudyTasks - completedTasks} task${totalStudyTasks - completedTasks === 1 ? "" : "s"} remaining`}
                </p>
              </div>
              <button
                onClick={addQuickTask}
                className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add task
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-6 h-6" />}
                title="No tasks scheduled"
                description="Add study sessions, practice blocks, and revision to your daily plan. Check them off as you go."
                action={
                  <Button size="sm" onClick={addQuickTask}>
                    <Plus className="w-4 h-4 mr-1.5" /> Add your first task
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {upcomingTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-ink-850 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-success-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className={cn("text-sm font-medium truncate", task.completed ? "text-slate-500 line-through" : "text-white")}>
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{task.startTime}–{task.endTime}</span>
                        <span>·</span>
                        <span>{minutesToHM(task.estimatedMinutes)}</span>
                      </div>
                    </div>

                    <span className={cn("text-[11px] px-2 py-0.5 rounded-md border font-medium flex-shrink-0", TASK_TYPE_STYLES[task.type])}>
                      {task.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col items-center text-center">
            <h2 className="font-semibold text-white self-start mb-2">Today's goal</h2>
            <ProgressRing
              progress={Math.min(dayProgress, 100)}
              size={160}
              strokeWidth={12}
              label="plan done"
              sublabel={totalStudyTasks > 0 ? `${completedTasks}/${totalStudyTasks} tasks` : "no tasks yet"}
              className="my-4"
            />
            <Link to="/app/focus" className="mt-2 w-full">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-sm font-medium transition-all">
                <Play className="w-4 h-4" /> Start Focus Mode
              </button>
            </Link>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white">Chapter progress</h2>
              <button
                onClick={addQuickChapter}
                className="text-sm text-accent-400 hover:text-accent-300 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add chapter
              </button>
            </div>

            {chapters.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-6 h-6" />}
                title="No chapters tracked yet"
                description="Add chapters from your syllabus to track lectures, questions, and confidence levels."
                action={
                  <Button size="sm" onClick={addQuickChapter}>
                    <Plus className="w-4 h-4 mr-1.5" /> Add your first chapter
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {chapters.slice(0, 5).map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-slate-200">{c.name}</span>
                      <span className="text-slate-500">{c.subject} · {c.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full",
                          c.progress === 100 ? "bg-success-500" : c.progress > 0 ? "bg-accent-500" : "bg-slate-700"
                        )}
                      />
                    </div>
                  </div>
                ))}
                {chapters.length > 5 && (
                  <Link to="/app/chapters" className="block text-center text-sm text-accent-400 hover:text-accent-300 pt-2">
                    View all {chapters.length} chapters
                  </Link>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4.5 h-4.5 text-accent-400" />
                Recent mocks
              </h2>
            </div>
            {recentMocks.length === 0 ? (
              <EmptyState
                icon={<Trophy className="w-6 h-6" />}
                title="No mocks logged"
                description="Log your mock test scores to track performance and spot weak chapters."
              />
            ) : (
              <div className="space-y-3">
                {recentMocks.map((m) => (
                  <MockRow key={m.id} mock={m} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger-400" />
              Need attention
            </h2>
          </div>
          {weakChapters.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {chapters.length === 0
                ? "Add chapters and mark confidence to see weak areas here."
                : "No weak chapters detected. Keep it up!"}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weakChapters.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-danger-600/5 border border-danger-500/15">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-danger-600/15 text-danger-300 border border-danger-500/20">Low confidence</span>
                  </div>
                  <p className="text-xs text-slate-400">{c.subject} · {c.lecturesRemaining} lectures, {c.questionsRemaining} Qs left</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MockRow({ mock }: { mock: MockTest }) {
  const pct = Math.round((mock.obtainedMarks / mock.totalMarks) * 100);
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-ink-850 border border-white/5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white truncate">{mock.testName}</div>
        <div className="text-xs text-slate-500 mt-0.5">{mock.subject} · {formatRelative(mock.date)}</div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <div className={cn("text-lg font-bold", pct >= 75 ? "text-success-400" : pct >= 50 ? "text-warning-400" : "text-danger-400")}>
          {pct}%
        </div>
        <div className="text-[10px] text-slate-500">{mock.obtainedMarks}/{mock.totalMarks}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub: string; color: "accent" | "success" | "warning" | "danger";
}) {
  const colors = {
    accent: "bg-accent-600/10 border-accent-500/20 text-accent-400",
    success: "bg-success-600/10 border-success-500/20 text-success-400",
    warning: "bg-warning-600/10 border-warning-500/20 text-warning-400",
    danger: "bg-danger-600/10 border-danger-500/20 text-danger-400",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center mb-3", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400 mt-0.5">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </motion.div>
  );
}
