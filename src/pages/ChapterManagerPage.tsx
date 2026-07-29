import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { UserChapter } from "../lib/supabase";
import { cn, calcProgress, statusColor } from "../lib/utils";
import { BookOpen, Search, ChevronDown, Check, Loader2 } from "lucide-react";

const PROGRESS_STEPS = [
  { key: "lectureCompleted", label: "Lecture" },
  { key: "notesCompleted", label: "Notes" },
  { key: "dppCompleted", label: "DPP" },
  { key: "pyqsSolved", label: "PYQs" },
  { key: "moduleQuestionsCompleted", label: "Module Qs" },
  { key: "formulaRevised", label: "Formula" },
  { key: "revision1", label: "Rev 1" },
  { key: "revision2", label: "Rev 2" },
  { key: "revision3", label: "Rev 3" },
  { key: "conceptMastered", label: "Mastered" },
];

const STATUS_FILTERS = ["all", "not_started", "in_progress", "completed"] as const;

export default function ChapterManagerPage() {
  const { session, profile } = useAuth();
  const [chapters, setChapters] = useState<UserChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from("user_chapters")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("exam", profile?.target_exam || "")
      .order("subject", { ascending: true })
      .order("chapter", { ascending: true });
    setChapters((data ?? []) as UserChapter[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [session, profile]);

  const subjects = useMemo(() => {
    return Array.from(new Set(chapters.map((c) => c.subject))).sort();
  }, [chapters]);

  const filtered = useMemo(() => {
    return chapters.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (subjectFilter !== "all" && c.subject !== subjectFilter) return false;
      if (search && !c.chapter.toLowerCase().includes(search.toLowerCase()) && !c.subject.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [chapters, statusFilter, subjectFilter, search]);

  const toggleStep = async (ch: UserChapter, stepKey: string) => {
    setUpdating(true);
    const newProgress = { ...ch.progress, [stepKey]: !ch.progress[stepKey] } as Record<string, boolean>;
    const allDone = PROGRESS_STEPS.every((s) => newProgress[s.key]);
    const noneDone = !PROGRESS_STEPS.some((s) => newProgress[s.key]);
    const newStatus = allDone ? "completed" : noneDone ? "not_started" : "in_progress";
    const updated = { ...ch, progress: newProgress, status: newStatus };
    setChapters((prev) => prev.map((c) => c.id === ch.id ? updated : c));
    await supabase.from("user_chapters").update({
      progress: newProgress,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", ch.id);
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const stats = {
    total: chapters.length,
    notStarted: chapters.filter((c) => c.status === "not_started").length,
    inProgress: chapters.filter((c) => c.status === "in_progress").length,
    completed: chapters.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-600" /> Chapter Manager
        </h1>
        <p className="text-slate-500 mt-1">
          {stats.total} chapters · {stats.inProgress} in progress · {stats.completed} completed
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search chapters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-11"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all",
                statusFilter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {s.replace("_", " ")}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                subjectFilter === s ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chapter list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No chapters found</p>
          </div>
        ) : (
          filtered.map((ch) => {
            const pct = calcProgress(ch.progress);
            const isOpen = expanded === ch.id;
            return (
              <div key={ch.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : ch.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500">{ch.subject}</span>
                      <span className={cn("badge capitalize", statusColor(ch.status))}>
                        {ch.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{ch.chapter}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{pct}%</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 pt-3 animate-slide-up">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {PROGRESS_STEPS.map((step) => (
                        <button
                          key={step.key}
                          onClick={() => toggleStep(ch, step.key)}
                          disabled={updating}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                            ch.progress[step.key as string]
                              ? "bg-accent-50 border-accent-200 text-accent-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0",
                            ch.progress[step.key as string] ? "bg-accent-500 border-accent-500" : "border-slate-300"
                          )}>
                            {ch.progress[step.key as string] && <Check className="w-3 h-3 text-white" />}
                          </div>
                          {step.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                      <span>Lectures remaining: {ch.lectures_remaining}</span>
                      <span>Questions remaining: {ch.questions_remaining}</span>
                      <span>Confidence: {"★".repeat(ch.confidence)}{"☆".repeat(5 - ch.confidence)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
