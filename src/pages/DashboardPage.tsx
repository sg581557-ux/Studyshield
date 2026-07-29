import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Clock, Trophy, Check, SkipForward, Play, Pause, RotateCcw, PlusSquare, StickyNote, Timer, BookMarked, Target, BarChart3 } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useUserData } from '../context/UserDataContext';
import { useAuth } from '../context/AuthContext';
import { ExtensionDashboardSection } from '../components/extension/ExtensionDashboardSection';
import { getGreeting, todayISO, formatHours, getWeekHours, getWeekDays } from '../lib/utils';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}

function DashboardContent() {
  const { tasks, sessions, goals, streak, toggleTask, skipTask, updateGoal } = useUserData();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <WelcomeCard
        name={user?.name ?? 'User'}
        streak={streak.currentStreak}
        longestStreak={streak.longestStreak}
        todayHours={sessions.filter((s) => s.date === todayISO()).reduce((sum, s) => sum + s.duration, 0)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksWidget tasks={tasks} onToggle={toggleTask} onSkip={skipTask} />
        <PomodoroWidget onSessionEnd={(minutes) => {
          const today = todayISO();
          const th = sessions.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0) + minutes / 60;
          goals.forEach((g) => updateGoal(g.id, { dailyProgress: th }));
        }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudyStatistics sessions={sessions} />
        <GoalCard goals={goals} />
      </div>
      <QuickActions />
      <ExtensionDashboardSection />
    </div>
  );
}

// ===== Welcome Card =====
function WelcomeCard({ name, streak, longestStreak, todayHours }: { name: string; streak: number; longestStreak: number; todayHours: number }) {
  return (
    <GlassCard className="p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">{getGreeting()},</p>
          <h1 className="text-2xl font-bold text-white mt-0.5">{name} 👋</h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Flame size={16} className="text-orange-400" />
              <span className="text-sm font-medium text-orange-400">{streak} day streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <Clock size={16} className="text-accent-light" />
              {formatHours(todayHours)} today
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <Trophy size={20} className="text-warning mx-auto mb-1" />
            <p className="text-xs text-gray-500">Best Streak</p>
            <p className="text-lg font-bold text-white">{longestStreak}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ===== Tasks Widget =====
function TasksWidget({ tasks, onToggle, onSkip }: { tasks: ReturnType<typeof useUserData>['tasks']; onToggle: (id: string) => void; onSkip: (id: string) => void }) {
  const today = todayISO();
  const pending = tasks.filter((t) => t.dueDate === today && t.status === 'pending').slice(0, 5);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Today's Tasks</h2>
        <Link to="/tasks" className="text-sm text-accent-light hover:text-accent transition-colors">View All</Link>
      </div>
      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Check size={28} className="text-gray-600 mb-2" />
          <p className="text-sm text-gray-500">All caught up! No pending tasks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{task.subject}</span>
                  <Badge variant={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'}>{task.priority}</Badge>
                </div>
              </div>
              <button onClick={() => onToggle(task.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-success hover:bg-success/10 transition-colors" title="Complete">
                <Check size={16} />
              </button>
              <button onClick={() => onSkip(task.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-warning hover:bg-warning/10 transition-colors" title="Skip">
                <SkipForward size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ===== Pomodoro Widget =====
function PomodoroWidget({ onSessionEnd }: { onSessionEnd: (minutes: number) => void }) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            if (mode === 'work') onSessionEnd(25);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, onSessionEnd]);

  const setPreset = (minutes: number) => {
    setDuration(minutes * 60);
    setRemaining(minutes * 60);
    setRunning(false);
    setMode('work');
  };

  const toggle = () => setRunning(!running);
  const reset = () => { setRunning(false); setRemaining(duration); };

  const displayMin = Math.floor(remaining / 60);
  const displaySec = remaining % 60;
  const circumference = 2 * Math.PI * 70;
  const progress = 1 - remaining / duration;
  const dashOffset = circumference * (1 - progress);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Pomodoro Timer</h2>
        <Badge variant={mode === 'work' ? 'accent' : 'success'}>{mode === 'work' ? 'Focus' : 'Break'}</Badge>
      </div>

      <div className="flex justify-center mb-4">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle cx="80" cy="80" r="70" fill="none" stroke="url(#pomGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
            <defs>
              <linearGradient id="pomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white tabular-nums">{displayMin}:{displaySec.toString().padStart(2, '0')}</span>
            <span className="text-xs text-gray-500 mt-1">{mode === 'work' ? 'Focus time' : 'Break time'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {([25, 50, 90] as const).map((m) => (
          <button key={m} onClick={() => setPreset(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${duration === m * 60 && mode === 'work' ? 'bg-accent/10 text-accent-light border border-accent/20' : 'bg-white/[0.03] text-gray-400 border border-white/[0.06] hover:text-white'}`}>
            {m}m
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={toggle}>
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw size={16} />
          Reset
        </Button>
      </div>
    </GlassCard>
  );
}

// ===== Study Statistics =====
function StudyStatistics({ sessions }: { sessions: ReturnType<typeof useUserData>['sessions'] }) {
  const weekHours = getWeekHours(sessions);
  const weekDays = getWeekDays();
  const maxHours = Math.max(...weekHours, 1);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold text-white">Weekly Study Hours</h2>
      </div>
      <div className="flex items-end justify-between gap-2 h-40">
        {weekDays.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex-1 flex items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(weekHours[i] / maxHours) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="w-full rounded-t-lg bg-gradient-to-t from-accent/40 to-accent/80 min-h-[2px]"
                style={{ minHeight: weekHours[i] > 0 ? '4px' : '0' }}
              />
            </div>
            <span className="text-xs text-gray-500">{day.dayName.slice(0, 3)}</span>
            <span className="text-xs text-gray-400 font-medium">{formatHours(weekHours[i])}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ===== Goal Card =====
function GoalCard({ goals }: { goals: ReturnType<typeof useUserData>['goals'] }) {
  const goal = goals[0];
  if (!goal) return null;

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-accent-light" />
        <h2 className="text-lg font-semibold text-white">Study Goals</h2>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Daily Progress</span>
            <span className="text-sm font-medium text-white">{formatHours(goal.dailyProgress)} / {goal.targetHours}h</span>
          </div>
          <ProgressBar percentage={(goal.dailyProgress / goal.targetHours) * 100} barClassName="bg-gradient-to-r from-accent to-purple" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Weekly Progress</span>
            <span className="text-sm font-medium text-white">{formatHours(goal.weeklyProgress)} / {goal.targetHours * 7}h</span>
          </div>
          <ProgressBar percentage={(goal.weeklyProgress / (goal.targetHours * 7)) * 100} barClassName="bg-gradient-to-r from-purple to-accent" />
        </div>
      </div>
    </GlassCard>
  );
}

// ===== Quick Actions =====
function QuickActions() {
  const actions = [
    { to: '/tasks', label: 'New Task', icon: PlusSquare, color: 'from-accent/20 to-accent/5', iconColor: 'text-accent-light' },
    { to: '/notes', label: 'New Note', icon: StickyNote, color: 'from-purple/20 to-purple/5', iconColor: 'text-purple-light' },
    { to: '/planner', label: 'Plan Study', icon: Timer, color: 'from-accent/20 to-purple/5', iconColor: 'text-accent-light' },
    { to: '/chapters', label: 'Chapters', icon: BookMarked, color: 'from-purple/20 to-accent/5', iconColor: 'text-purple-light' },
  ];

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Link key={action.to} to={action.to}>
            <motion.div whileHover={{ y: -2 }} className={`p-4 rounded-xl bg-gradient-to-br ${action.color} border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer`}>
              <action.icon size={24} className={action.iconColor} />
              <p className="text-sm font-medium text-white mt-2">{action.label}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </GlassCard>
  );
}
