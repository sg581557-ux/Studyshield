import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { FocusSession, StudySession, UserChapter } from "../lib/supabase";
import { cn, minutesToHours, calcProgress } from "../lib/utils";
import { TrendingUp, Clock, Target, Award, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

export default function ProgressPage() {
  const { session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [chapters, setChapters] = useState<UserChapter[]>([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;
    Promise.all([
      supabase.from("focus_sessions").select("*").eq("user_id", uid).eq("completed", true),
      supabase.from("study_sessions").select("*").eq("user_id", uid).eq("completed", true),
      supabase.from("user_chapters").select("*").eq("user_id", uid).eq("exam", profile?.target_exam || ""),
    ]).then(([fRes, sRes, cRes]) => {
      setFocusSessions((fRes.data ?? []) as FocusSession[]);
      setStudySessions((sRes.data ?? []) as StudySession[]);
      setChapters((cRes.data ?? []) as UserChapter[]);
      setLoading(false);
    });
  }, [session, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const allSessions = [...focusSessions, ...studySessions];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyData = last7Days.map((d) => {
    const dayStr = d.toDateString();
    const dayMin = allSessions
      .filter((s) => new Date(s.started_at).toDateString() === dayStr)
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    return {
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      minutes: dayMin,
      hours: Math.round((dayMin / 60) * 10) / 10,
    };
  });

  const totalMinutes = allSessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalSessions = allSessions.length;
  const avgPerDay = totalMinutes / 7;

  const subjectData = chapters.reduce((acc: Record<string, number>, ch) => {
    const pct = calcProgress(ch.progress);
    acc[ch.subject] = (acc[ch.subject] || 0) + pct;
    return acc;
  }, {});
  const subjectCount = chapters.reduce((acc: Record<string, number>, ch) => {
    acc[ch.subject] = (acc[ch.subject] || 0) + 1;
    return acc;
  }, {});
  const avgBySubject = Object.entries(subjectData).map(([subject, totalPct]) => ({
    subject: subject.length > 8 ? subject.slice(0, 8) + "..." : subject,
    progress: Math.round(totalPct / (subjectCount[subject] || 1)),
  }));

  const statusData = [
    { name: "Completed", value: chapters.filter((c) => c.status === "completed").length, color: "#10b981" },
    { name: "In Progress", value: chapters.filter((c) => c.status === "in_progress").length, color: "#2d7ff0" },
    { name: "Not Started", value: chapters.filter((c) => c.status === "not_started").length, color: "#cbd5e1" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-brand-600" /> Progress Analytics
        </h1>
        <p className="text-slate-500 mt-1">Track your study performance over time</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <Clock className="w-8 h-8 text-brand-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">{minutesToHours(Math.round(totalMinutes))}</p>
          <p className="text-sm text-slate-500">Total Study Time</p>
        </div>
        <div className="card p-5">
          <Target className="w-8 h-8 text-accent-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">{totalSessions}</p>
          <p className="text-sm text-slate-500">Total Sessions</p>
        </div>
        <div className="card p-5">
          <TrendingUp className="w-8 h-8 text-warning-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">{minutesToHours(Math.round(avgPerDay))}</p>
          <p className="text-sm text-slate-500">Avg / Day (7d)</p>
        </div>
        <div className="card p-5">
          <Award className="w-8 h-8 text-error-500 mb-3" />
          <p className="text-2xl font-bold text-slate-900">
            {chapters.filter((c) => c.status === "completed").length}/{chapters.length}
          </p>
          <p className="text-sm text-slate-500">Chapters Done</p>
        </div>
      </div>

      {/* Daily study chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Daily Study Time (Last 7 Days)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
              formatter={(value: number) => [`${value}h`, "Study Time"]}
            />
            <Bar dataKey="hours" fill="#2d7ff0" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject progress */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Progress by Subject</h2>
          {avgBySubject.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No chapter data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgBySubject} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                <YAxis dataKey="subject" type="category" stroke="#94a3b8" fontSize={12} width={70} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                  formatter={(value: number) => [`${value}%`, "Avg Progress"]}
                />
                <Bar dataKey="progress" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chapter status pie */}
        <div className="card p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Chapter Status Distribution</h2>
          {statusData.length === 0 ? (
            <p className="text-slate-400 text-center py-12">No chapters yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "13px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full")} style={{ backgroundColor: d.color }} />
                <span className="text-xs text-slate-600">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
