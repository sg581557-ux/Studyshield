import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, User, Calendar, School, TrendingUp, Mic2,
  Clock, AlarmClock, Sunrise, BookOpen, ListTodo, Target, Languages,
  ChevronRight, ChevronLeft, Check, Plus, X, Building2, PlayCircle,
  CalendarClock, Layers, Flag, Sparkles, MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { db } from "../services/db";
import { Button } from "../components/ui";
import { friendlySaveError } from "../lib/authErrors";
import {
  CURRENT_LEVELS, PRIMARY_GOALS,
  PREFERRED_LANGUAGES, MENTOR_TONES, SUBJECTS_BY_EXAM, ONBOARDING_STEP_COUNT,
  STUDY_TIME_BUCKETS, SESSION_LENGTHS, BREAK_OPTIONS, DAYS_OFF_OPTIONS,
  PRODUCTIVE_SLOTS, weekdayStudyHours, HOW_STUDY_OPTIONS, COACHING_NAME_OPTIONS,
  CLASS_MODE_OPTIONS, LECTURE_DURATION_OPTIONS, PREFERRED_STUDY_TIMES,
  examIdForOnboarding, STREAMS, STREAM_SUBJECTS, SCHOOL_CLASSES, SCHOOL_BOARDS,
  ACADEMIC_GOALS, primaryExamFromGoals, SLEEP_GOAL_OPTIONS,
  TESTS_PER_WEEK_OPTIONS, STUDY_DAYS_OPTIONS, chaptersForSubject, streamSubjects,
  SLOT_LABELS,
} from "../lib/onboarding";
import { aliasExamId } from "../services/db";
import type { OnboardingInput, OnboardingBacklog, ClassScheduleEntry } from "../lib/types";

const STEP_TITLES = [
  "Basic Details", "Stream", "Academic Goals", "Target Year", "School / College", "Current Level",
  "How do you study?", "Coaching", "Class Mode", "Classes & Schedule", "Daily Study Time",
  "Routine & Sleep", "Productive Time", "Subjects", "Backlog", "Weekly Tests", "Goals", "AI Preferences",
];

const emptyBacklog: OnboardingBacklog = {
  subject: "", chapter: "", pending_lectures: 0, pending_dpps: 0,
  module_remaining: 0, pending_pyqs: 0, revision_pending: 0,
  lecture_status: "not_started", module_pct: 0, revision_level: 0, confidence: 3,
};

function defaultForm(): OnboardingInput {
  return {
    full_name: "", age: "", school_class: "", target_exam: "", target_exam_other: "",
    exam_year: String(new Date().getFullYear() + 1), school_name: "", current_level: "",
    coaching: "none", coaching_other: "", coaching_type: "online", coaching_name: "",
    class_mode: "", class_schedule: [], lecture_duration: 60, lectures_per_day: 2,
    preferred_study_time: "",
    daily_goal_hours: 6, wake_up_time: "06:00",
    sleep_time: "22:30", subjects: [], has_backlog: false, backlogs: [],
    primary_goal: "", custom_goal: "", preferred_language: "en", mentor_tone: "balanced",
    coaching_start: "16:00", coaching_end: "19:00",
    weekday_study_hours: "", custom_weekday_hours: 4,
    saturday_study_hours: 0, sunday_study_hours: 0,
    session_length_min: 45, break_min: 10, days_off: [], productive_slots: [],
    // Onboarding v3.
    stream: "", academic_goals: [], board: "", productive_time: "",
    desired_sleep_hours: 8, tests_per_week: 1, school_days: [],
    school_start: "07:00", school_end: "14:00", study_days: [],
  };
}

// Steps 7–9 (coaching name / class mode / schedule) are skipped for
// self-study students — the planner never needs class info for them.
function stepHidden(i: number, coachingType: string): boolean {
  return coachingType === "self_study" && (i === 7 || i === 8 || i === 9);
}

const LECTURE_STATUS_OPTIONS = [
  { value: "not_started", label: "Not watched" },
  { value: "in_progress", label: "Partly watched" },
  { value: "completed", label: "Watched" },
];
const REVISION_LEVEL_OPTIONS = [
  { value: 0, label: "0 — none" },
  { value: 1, label: "1 round" },
  { value: 2, label: "2 rounds" },
  { value: 3, label: "3 rounds" },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = profile?.onboarding_step ?? 0;
    let s = saved > 0 && saved < ONBOARDING_STEP_COUNT ? saved : 0;
    if (s >= ONBOARDING_STEP_COUNT) s = ONBOARDING_STEP_COUNT - 1;
    // Guard: a stale saved step landing on a step hidden by self-study.
    const savedData = profile?.onboarding_data as Partial<OnboardingInput> | undefined;
    if (savedData?.coaching_type === "self_study" && (s === 7 || s === 8 || s === 9)) s = 10;
    return s;
  });
  const [form, setForm] = useState<OnboardingInput>(() => {
    const saved = profile?.onboarding_data;
    if (saved && typeof saved === "object") {
      const merged = { ...defaultForm(), ...saved } as unknown as OnboardingInput;
      if (!Array.isArray(merged.subjects)) merged.subjects = [];
      if (!Array.isArray(merged.backlogs)) merged.backlogs = [];
      if (!Array.isArray(merged.class_schedule)) merged.class_schedule = [];
      if (!Array.isArray(merged.academic_goals)) merged.academic_goals = [];
      if (!Array.isArray(merged.school_days)) merged.school_days = [];
      if (!Array.isArray(merged.study_days)) merged.study_days = [];
      return merged;
    }
    return { ...defaultForm(), full_name: profile?.full_name ?? "" };
  });
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingBacklog>({ ...emptyBacklog });
  const [scheduleDraft, setScheduleDraft] = useState<{ day: string; start: string; end: string }>({ day: "", start: "16:00", end: "19:00" });
  // Chapter options per subject: DB syllabus when available, else static catalog.
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, string[]>>({});

  function update(patch: Partial<OnboardingInput>) { setForm((p) => ({ ...p, ...patch })); }
  function updateDraft(patch: Partial<OnboardingBacklog>) { setDraft((p) => ({ ...p, ...patch })); }

  // Primary competitive exam derived from the multi-select academic goals.
  // Falls back to the stored target_exam for v2 drafts that never had goals.
  const derivedExam = primaryExamFromGoals(form.academic_goals, form.target_exam_other) || form.target_exam;
  const examId = derivedExam ? examIdForOnboarding(derivedExam) : "";

  const examSubjects = useMemo(
    () => (derivedExam ? SUBJECTS_BY_EXAM[derivedExam] ?? SUBJECTS_BY_EXAM.Other : []),
    [derivedExam],
  );
  // v3: subjects auto-load from the stream; exam-based list is the fallback.
  const subjectOptions = useMemo(
    () => (form.stream ? streamSubjects(form.stream) : examSubjects),
    [form.stream, examSubjects],
  );

  // Prefetch the DB syllabus chapters for the selected subject. The fetch is
  // inlined in the effect (React's documented fetch-on-mount shape); the
  // static catalog renders immediately as the fallback.
  useEffect(() => {
    const subject = draft.subject;
    if (!subject || !examId || examId === "other") return;
    let cancelled = false;
    (async () => {
      try {
        const subs = await db.getSubjects(examId);
        const match = subs.find((s) => s.name.toLowerCase() === subject.toLowerCase())
          ?? subs.find((s) => s.name.toLowerCase().includes(subject.toLowerCase()));
        if (match) {
          const chapters = (await db.getChapters(match.id)).map((c) => c.name);
          if (chapters.length > 0 && !cancelled) setChaptersBySubject((p) => ({ ...p, [subject]: chapters }));
        }
      } catch (err) { console.warn("[onboarding] chapter load failed, using static catalog", err); }
    })();
    return () => { cancelled = true; };
  }, [draft.subject, examId]);

  const chapterOptions = draft.subject ? (chaptersBySubject[draft.subject] ?? chaptersForSubject(draft.subject, form.school_class, form.stream)) : [];
  // "(loading.)" hint: shown only while the DB syllabus for this subject is
  // still pending — the static catalog renders immediately as the fallback.
  const loadingChapters = Boolean(draft.subject && examId && examId !== "other") && !chaptersBySubject[draft.subject];

  function canNext(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: return form.full_name.trim().length > 0;
      case 1: return form.stream.trim().length > 0;
      case 2: return form.academic_goals.length > 0 && (!form.academic_goals.includes("other") || form.target_exam_other.trim().length > 0);
      case 3: return /^\d{4}$/.test(form.exam_year.trim());
      case 4: return true;
      case 5: return form.current_level.trim().length > 0;
      case 6: return form.coaching_type.trim().length > 0;
      case 7: return form.coaching !== "none" && form.coaching !== "" && (form.coaching !== "other" || form.coaching_other.trim().length > 0);
      case 8: return form.class_mode.trim().length > 0;
      case 9:
        if (form.class_mode === "live") return form.class_schedule.length > 0;
        if (form.class_mode === "recorded") return form.lecture_duration > 0 && form.lectures_per_day > 0 && form.preferred_study_time !== "";
        return true;
      case 10: return form.weekday_study_hours.trim().length > 0 && (form.weekday_study_hours !== "custom" || form.custom_weekday_hours >= 1);
      case 11: return !!form.wake_up_time && !!form.sleep_time && form.desired_sleep_hours > 0 && form.session_length_min > 0 && form.break_min > 0;
      case 12: return form.productive_time.trim().length > 0;
      case 13: return form.subjects.length > 0;
      case 14: return !form.has_backlog || form.backlogs.length > 0;
      case 15: return true;
      case 16: return form.primary_goal.trim().length > 0 && (form.primary_goal !== "custom" || form.custom_goal.trim().length > 0);
      case 17: return true;
      default: return true;
    }
  }

  function selectStream(value: string) {
    update({ stream: value, subjects: streamSubjects(value) });
  }
  function toggleGoal(value: string) {
    const goals = form.academic_goals.includes(value)
      ? form.academic_goals.filter((g) => g !== value)
      : [...form.academic_goals, value];
    update({ academic_goals: goals, target_exam: primaryExamFromGoals(goals, form.target_exam_other) || form.target_exam });
  }
  function addBacklogItem() {
    if (!draft.subject.trim() || !draft.chapter.trim()) {
      toast.error("Enter a subject and chapter for the backlog item.");
      return;
    }
    const item: OnboardingBacklog = {
      ...draft,
      subject: draft.subject.trim(),
      chapter: draft.chapter.trim(),
      // module_remaining (legacy count) mirrors the v3 module % (0–100 scale).
      module_remaining: Math.max(0, 100 - (draft.module_pct ?? 0)),
      revision_pending: draft.revision_level ?? 0,
    };
    setForm((p) => ({ ...p, backlogs: [...p.backlogs, item] }));
    setDraft({ ...emptyBacklog, subject: draft.subject });
  }
  function removeBacklogItem(index: number) {
    setForm((p) => ({ ...p, backlogs: p.backlogs.filter((_, i) => i !== index) }));
  }
  function toggleSubject(name: string) {
    setForm((p) => ({
      ...p,
      subjects: p.subjects.includes(name) ? p.subjects.filter((s) => s !== name) : [...p.subjects, name],
    }));
  }
  function toggleDay(list: "school_days" | "study_days" | "days_off", value: string) {
    const cur = form[list];
    update({ [list]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] });
  }

  function addScheduleBlock() {
    const { day, start, end } = scheduleDraft;
    if (!day) { toast.error("Pick a day for the class block."); return; }
    if (!start || !end) { toast.error("Set the class start and end time."); return; }
    if (start >= end) { toast.error("Class end time must be after the start time."); return; }
    if (form.class_schedule.some((e) => e.day === day && e.start === start && e.end === end)) {
      toast.error("That class block is already added.");
      return;
    }
    const block: ClassScheduleEntry = { day, start, end };
    setForm((p) => ({ ...p, class_schedule: [...p.class_schedule, block] }));
    setScheduleDraft({ day: "", start: "16:00", end: "19:00" });
  }
  function removeScheduleBlock(index: number) {
    setForm((p) => ({ ...p, class_schedule: p.class_schedule.filter((_, i) => i !== index) }));
  }
  function selectCoachingName(opt: { value: string; label: string }) {
    if (opt.value === "other") {
      update({ coaching: "other", coaching_name: "", coaching_other: form.coaching_other });
    } else {
      update({ coaching: opt.value, coaching_name: opt.label, coaching_other: "" });
    }
  }
  function selectHowStudy(value: string) {
    if (value === "self_study") {
      update({
        coaching_type: value,
        coaching: "none", coaching_name: "", coaching_other: "",
        class_mode: "", class_schedule: [],
      });
    } else {
      update({ coaching_type: value });
    }
  }

  function timeToDisplay(t: string): string {
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  }

  async function persistProgress(nextStep: number) {
    if (!user) return;
    const f = { ...form };
    try { await db.saveOnboardingProgress(user.id, nextStep, f); } catch { /* best effort */ }
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      // completeOnboarding upserts, RE-SELECTS the row and only returns once
      // the database confirms onboarding_completed === true (with a retry).
      const savedProfile = await db.completeOnboarding(user.id, user.email ?? "", form);
      if (!savedProfile?.onboarding_completed) {
        throw new Error("Your profile didn't save. Please try again.");
      }
      if (form.has_backlog && form.backlogs.length > 0) {
        await db.addOnboardingBacklogs(user.id, form.backlogs, aliasExamId(examIdForOnboarding(derivedExam)));
      }
      await refreshProfile();
      toast.success("Profile set up!");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error(friendlySaveError(err, "profiles"));
    } finally {
      setSaving(false);
    }
  }

  function nextVisible(from: number): number {
    let s = from + 1;
    while (s < ONBOARDING_STEP_COUNT - 1 && stepHidden(s, form.coaching_type)) s++;
    return s;
  }
  function prevVisible(from: number): number {
    let s = from - 1;
    while (s > 0 && stepHidden(s, form.coaching_type)) s--;
    return s;
  }

  function next() {
    if (!canNext(step)) { toast.error("Please complete the required fields on this step."); return; }
    if (step >= ONBOARDING_STEP_COUNT - 1) {
      void finish();
      return;
    }
    const ns = nextVisible(step);
    setStep(ns);
    void persistProgress(ns);
  }
  function back() {
    if (step === 0) return;
    const ps = prevVisible(step);
    setStep(ps);
    void persistProgress(ps);
  }

  const isLast = step === ONBOARDING_STEP_COUNT - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950 py-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">Welcome to StudyShield</h1>
          <p className="text-xs text-slate-500 mt-1">A few quick questions to build your study profile</p>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {STEP_TITLES.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent-500" : "bg-white/10"}`} title={`${i + 1}. ${s}`} />
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] text-slate-500">{step + 1} / {ONBOARDING_STEP_COUNT}</span>
          <span className="text-[11px] text-slate-600 truncate">— {STEP_TITLES[step]}</span>
        </div>

        <div className="rounded-2xl bg-ink-900 border border-white/10 p-5 min-h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4" aria-live="polite">
              {/* 1 — Basic Details */}
              {step === 0 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><User className="w-4 h-4 text-accent-400" /> Basic Details</h2>
                  <label className="block">
                    <span className="input-label">Full name *</span>
                    <input className="input-base" value={form.full_name} onChange={(e) => update({ full_name: e.target.value })} placeholder="Your name" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="input-label">Age</span>
                      <input type="number" min={3} max={100} className="input-base" value={form.age} onChange={(e) => update({ age: e.target.value })} placeholder="e.g. 17" />
                    </label>
                    <div>
                      <span className="input-label">Class / College Year *</span>
                      <div className="grid grid-cols-4 gap-1.5 mt-1">
                        {SCHOOL_CLASSES.map((c) => (
                          <button
                            key={c.value} type="button" onClick={() => update({ school_class: c.value })}
                            className={`rounded-lg px-1 py-2 text-center text-xs font-medium transition-colors ${form.school_class === c.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {c.label.replace("Class ", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 2 — Stream */}
              {step === 1 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-accent-400" /> Your Stream *</h2>
                  <p className="text-xs text-slate-500">Your subjects load automatically from your stream.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {STREAMS.map((s) => (
                      <button
                        key={s.value} type="button" onClick={() => selectStream(s.value)}
                        className={`rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${form.stream === s.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {form.stream && (
                    <p className="text-[11px] text-slate-500">
                      Subjects: {(STREAM_SUBJECTS[form.stream] ?? []).join(", ")}
                    </p>
                  )}
                </>
              )}

              {/* 3 — Academic Goals */}
              {step === 2 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-accent-400" /> Academic Goals *</h2>
                  <p className="text-xs text-slate-500">Select all that apply — school exams and competitive exams.</p>
                  <div className="space-y-2">
                    {ACADEMIC_GOALS.slice(0, 3).length > 0 && (
                      <>
                        <span className="input-label">School exams</span>
                        <div className="grid grid-cols-2 gap-2">
                          {ACADEMIC_GOALS.slice(0, 3).map((g) => {
                            const active = form.academic_goals.includes(g.value);
                            return (
                              <button
                                key={g.value} type="button" onClick={() => toggleGoal(g.value)}
                                className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                              >
                                {active && <Check className="w-3.5 h-3.5 inline mr-1" />}{g.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <span className="input-label">Competitive exams</span>
                    <div className="grid grid-cols-2 gap-2">
                      {ACADEMIC_GOALS.slice(3).map((g) => {
                        const active = form.academic_goals.includes(g.value);
                        return (
                          <button
                            key={g.value} type="button" onClick={() => toggleGoal(g.value)}
                            className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {active && <Check className="w-3.5 h-3.5 inline mr-1" />}{g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {form.academic_goals.includes("other") && (
                    <label className="block">
                      <span className="input-label">Which exam? *</span>
                      <input className="input-base" value={form.target_exam_other} onChange={(e) => update({ target_exam_other: e.target.value })} placeholder="Type your exam" />
                    </label>
                  )}
                </>
              )}

              {/* 4 — Target Year */}
              {step === 3 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-accent-400" /> Target Year *</h2>
                  <p className="text-xs text-slate-500">The year you plan to appear for your target exam.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map((y) => (
                      <button
                        key={y} type="button" onClick={() => update({ exam_year: String(y) })}
                        className={`rounded-xl px-3 py-3 text-center text-sm font-medium transition-colors ${form.exam_year === String(y) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="input-label">Or enter a year *</span>
                    <input type="number" min={new Date().getFullYear()} max={2040} className="input-base" value={form.exam_year} onChange={(e) => update({ exam_year: e.target.value })} placeholder="e.g. 2028" />
                  </label>
                </>
              )}

              {/* 5 — School / College */}
              {step === 4 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><School className="w-4 h-4 text-accent-400" /> School / College</h2>
                  <p className="text-xs text-slate-500">The AI Planner blocks school hours — set your school days and timings so your plan fits your free time.</p>
                  <label className="block">
                    <span className="input-label">School / College name</span>
                    <input className="input-base" value={form.school_name} onChange={(e) => update({ school_name: e.target.value })} placeholder="e.g. Delhi Public School" />
                  </label>
                  <div>
                    <span className="input-label">Board</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {SCHOOL_BOARDS.map((b) => (
                        <button
                          key={b.value} type="button" onClick={() => update({ board: b.value })}
                          className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.board === b.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">School days</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DAYS_OFF_OPTIONS.map((d) => {
                        const active = form.school_days.includes(d.value);
                        return (
                          <button
                            key={d.value} type="button" onClick={() => toggleDay("school_days", d.value)}
                            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="input-label">School starts</span>
                      <input type="time" className="input-base" value={form.school_start} onChange={(e) => update({ school_start: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="input-label">School ends</span>
                      <input type="time" className="input-base" value={form.school_end} onChange={(e) => update({ school_end: e.target.value })} />
                    </label>
                  </div>
                </>
              )}

              {/* 6 — Current Level */}
              {step === 5 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent-400" /> Current Level *</h2>
                  <p className="text-xs text-slate-500">How would you rate your preparation right now?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CURRENT_LEVELS.map((l) => (
                      <button
                        key={l.value} type="button" onClick={() => update({ current_level: l.value })}
                        className={`rounded-xl px-3 py-3 text-sm font-medium transition-colors ${form.current_level === l.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 7 — How do you study? */}
              {step === 6 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Mic2 className="w-4 h-4 text-accent-400" /> How do you study? *</h2>
                  <p className="text-xs text-slate-500">This shapes how the AI Planner builds your daily plan.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {HOW_STUDY_OPTIONS.map((o) => (
                      <button
                        key={o.value} type="button" onClick={() => selectHowStudy(o.value)}
                        className={`rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${form.coaching_type === o.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 8 — Coaching (skipped for self-study) */}
              {step === 7 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-accent-400" /> Which coaching? *</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {COACHING_NAME_OPTIONS.map((c) => (
                      <button
                        key={c.value} type="button" onClick={() => selectCoachingName(c)}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.coaching === c.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {form.coaching === "other" && (
                    <label className="block">
                      <span className="input-label">Coaching name *</span>
                      <input className="input-base" value={form.coaching_other} onChange={(e) => update({ coaching_other: e.target.value })} placeholder="Coaching name" />
                    </label>
                  )}
                </>
              )}

              {/* 9 — Class mode (skipped for self-study) */}
              {step === 8 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><PlayCircle className="w-4 h-4 text-accent-400" /> How are your classes conducted? *</h2>
                  <p className="text-xs text-slate-500">Live classes block your calendar; recorded classes are scheduled automatically.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {CLASS_MODE_OPTIONS.map((o) => (
                      <button
                        key={o.value} type="button" onClick={() => update({ class_mode: o.value })}
                        className={`rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${form.class_mode === o.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 10 — Classes & schedule (skipped for self-study) */}
              {step === 9 && form.class_mode === "live" && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-accent-400" /> Class Schedule *</h2>
                  <p className="text-xs text-slate-500">Add every weekly live class block — the AI Planner will never plan study during these hours. You can add multiple blocks per day.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="input-label">Day *</span>
                      <select className="select-base" value={scheduleDraft.day} onChange={(e) => setScheduleDraft((d) => ({ ...d, day: e.target.value }))}>
                        <option value="" className="bg-slate-900 text-white">Pick a day…</option>
                        {DAYS_OFF_OPTIONS.map((d) => <option key={d.value} value={d.value} className="bg-slate-900 text-white">{d.label}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="input-label">Duration</span>
                      <div className="flex items-center gap-2">
                        <input type="time" className="input-base" value={scheduleDraft.start} onChange={(e) => setScheduleDraft((d) => ({ ...d, start: e.target.value }))} />
                        <span className="text-xs text-slate-500">to</span>
                        <input type="time" className="input-base" value={scheduleDraft.end} onChange={(e) => setScheduleDraft((d) => ({ ...d, end: e.target.value }))} />
                      </div>
                    </label>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={addScheduleBlock} disabled={!scheduleDraft.day}><Plus className="w-4 h-4" /> Add class block</Button>
                  {form.class_schedule.length > 0 && (
                    <ul className="space-y-1.5">
                      {form.class_schedule.map((b, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                          <span>{DAYS_OFF_OPTIONS.find((d) => d.value === b.day)?.label ?? b.day} — {timeToDisplay(b.start)} to {timeToDisplay(b.end)}</span>
                          <button type="button" onClick={() => removeScheduleBlock(i)} className="text-slate-500 hover:text-red-400 shrink-0" aria-label="Remove class block">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-slate-500">Example: Monday 4:00 PM – 7:00 PM, Wednesday 4:00 PM – 7:00 PM.</p>
                </>
              )}

              {/* 10b — Recorded lecture details (skipped for self-study) */}
              {step === 9 && form.class_mode === "recorded" && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-accent-400" /> Lecture Details *</h2>
                  <p className="text-xs text-slate-500">The AI Planner will auto-schedule your recorded lectures at your preferred study time.</p>
                  <div>
                    <span className="input-label">Average lecture duration *</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {LECTURE_DURATION_OPTIONS.map((o) => (
                        <button
                          key={o.value} type="button" onClick={() => update({ lecture_duration: Number(o.value) })}
                          className={`rounded-xl px-2 py-2.5 text-center text-sm transition-colors ${form.lecture_duration === Number(o.value) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Lectures per day *</span>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {[1, 2, 3, 4].map((n) => (
                        <button
                          key={n} type="button" onClick={() => update({ lectures_per_day: n })}
                          className={`rounded-xl px-2 py-2.5 text-center text-sm font-medium transition-colors ${form.lectures_per_day === n ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Preferred study time *</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {PREFERRED_STUDY_TIMES.map((o) => (
                        <button
                          key={o.value} type="button" onClick={() => update({ preferred_study_time: o.value })}
                          className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.preferred_study_time === o.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 11 — Daily Study Time */}
              {step === 10 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Clock className="w-4 h-4 text-accent-400" /> Daily Study Time *</h2>
                  <p className="text-xs text-slate-500">How many hours can you realistically study on a normal weekday? Your plan sizes itself around this.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STUDY_TIME_BUCKETS.map((b) => (
                      <button
                        key={b.value} type="button" onClick={() => update({ weekday_study_hours: b.value, daily_goal_hours: weekdayStudyHours(b.value, form.custom_weekday_hours) })}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.weekday_study_hours === b.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  {form.weekday_study_hours === "custom" && (
                    <label className="block">
                      <span className="input-label">Custom hours per weekday</span>
                      <input
                        type="number" min={1} max={16} className="input-base"
                        value={form.custom_weekday_hours}
                        onChange={(e) => { const v = Number(e.target.value); update({ custom_weekday_hours: v, daily_goal_hours: weekdayStudyHours("custom", v) }); }}
                      />
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="input-label">Saturday hours</span>
                      <input
                        type="number" min={0} max={16} className="input-base"
                        value={form.saturday_study_hours || ""}
                        onChange={(e) => update({ saturday_study_hours: Math.max(0, Math.min(16, Number(e.target.value))) })}
                        placeholder="e.g. 8"
                      />
                    </label>
                    <label className="block">
                      <span className="input-label">Sunday hours</span>
                      <input
                        type="number" min={0} max={16} className="input-base"
                        value={form.sunday_study_hours || ""}
                        onChange={(e) => update({ sunday_study_hours: Math.max(0, Math.min(16, Number(e.target.value))) })}
                        placeholder="e.g. 7"
                      />
                    </label>
                  </div>
                  <div>
                    <span className="input-label">Which days do you study? *</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {STUDY_DAYS_OPTIONS.map((d) => {
                        const active = form.study_days.includes(d.value);
                        return (
                          <button
                            key={d.value} type="button" onClick={() => toggleDay("study_days", d.value)}
                            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">Weekends usually differ — the planner uses the Saturday/Sunday hours on those days.</p>
                </>
              )}

              {/* 12 — Routine & Sleep */}
              {step === 11 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><AlarmClock className="w-4 h-4 text-accent-400" /> Routine &amp; Sleep *</h2>
                  <p className="text-xs text-slate-500">Your usual routine — the planner works around it and protects your sleep.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="input-label">Wake-up time *</span>
                      <input type="time" className="input-base" value={form.wake_up_time} onChange={(e) => update({ wake_up_time: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="input-label">Sleep time *</span>
                      <input type="time" className="input-base" value={form.sleep_time} onChange={(e) => update({ sleep_time: e.target.value })} />
                    </label>
                  </div>
                  <div>
                    <span className="input-label">How much sleep do you need? *</span>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {SLEEP_GOAL_OPTIONS.map((s) => (
                        <button
                          key={s.value} type="button" onClick={() => update({ desired_sleep_hours: Number(s.value) })}
                          className={`rounded-xl px-2 py-2.5 text-center text-sm transition-colors ${form.desired_sleep_hours === Number(s.value) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Session length *</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {SESSION_LENGTHS.map((s) => (
                        <button
                          key={s.value} type="button" onClick={() => update({ session_length_min: Number(s.value) })}
                          className={`rounded-xl px-2 py-2.5 text-center text-sm transition-colors ${form.session_length_min === Number(s.value) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Break length *</span>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {BREAK_OPTIONS.map((b) => (
                        <button
                          key={b.value} type="button" onClick={() => update({ break_min: Number(b.value) })}
                          className={`rounded-xl px-2 py-2 text-center text-sm transition-colors ${form.break_min === Number(b.value) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Full days off each week (optional)</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {DAYS_OFF_OPTIONS.map((d) => {
                        const active = form.days_off.includes(d.value);
                        return (
                          <button
                            key={d.value} type="button" onClick={() => toggleDay("days_off", d.value)}
                            className={`rounded-full px-3 py-1.5 text-xs transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* 13 — Productive Time */}
              {step === 12 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Sunrise className="w-4 h-4 text-accent-400" /> Productive Time *</h2>
                  <p className="text-xs text-slate-500">When do you focus best? The planner schedules difficult tasks in your peak window.</p>
                  <div>
                    <span className="input-label">Your peak window *</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {PRODUCTIVE_SLOTS.map((s) => (
                        <button
                          key={s.value} type="button" onClick={() => update({ productive_time: s.value })}
                          className={`rounded-xl px-3 py-3 text-left text-sm transition-colors ${form.productive_time === s.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="input-label">Other good windows (optional)</span>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {PRODUCTIVE_SLOTS.map((s) => {
                        const active = form.productive_slots.includes(s.value);
                        return (
                          <button
                            key={s.value} type="button"
                            onClick={() => update({ productive_slots: active ? form.productive_slots.filter((v) => v !== s.value) : [...form.productive_slots, s.value] })}
                            className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                          >
                            {active && <Check className="w-3.5 h-3.5 inline mr-1" />}{s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {form.productive_time === "night_owl" && (
                    <p className="text-[11px] text-accent-400">Night owl mode: the planner will leave your morning hours light and schedule deep work after 10 PM.</p>
                  )}
                </>
              )}

              {/* 14 — Subjects */}
              {step === 13 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent-400" /> Subjects *</h2>
                  <p className="text-xs text-slate-500">{form.stream ? `Auto-loaded from ${STREAMS.find((s) => s.value === form.stream)?.label ?? "your stream"} — tap to adjust.` : "Select the subjects you're preparing for."}</p>
                  <div className="flex flex-wrap gap-2">
                    {subjectOptions.map((s) => {
                      const active = form.subjects.includes(s);
                      return (
                        <button
                          key={s} type="button" onClick={() => toggleSubject(s)}
                          className={`rounded-full px-4 py-2 text-sm transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {active ? <><Check className="w-3.5 h-3.5 inline mr-1" />{s}</> : s}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 15 — Backlog */}
              {step === 14 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><ListTodo className="w-4 h-4 text-accent-400" /> Backlog</h2>
                  <p className="text-xs text-slate-500">Do you currently have backlogs (pending lectures / DPPs / modules / PYQs)?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((o) => (
                      <button
                        key={o.l} type="button" onClick={() => update({ has_backlog: o.v })}
                        className={`rounded-xl px-3 py-3 text-sm font-medium transition-colors ${form.has_backlog === o.v ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {form.has_backlog && (
                    <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
                      <span className="input-label">Add a backlog item</span>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block col-span-2">
                          <span className="input-label">Subject</span>
                          <select className="select-base" value={draft.subject} onChange={(e) => { updateDraft({ subject: e.target.value, chapter: "" }); }}>
                            <option value="" className="bg-slate-900 text-white">Pick a subject…</option>
                            {subjectOptions.map((s) => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                          </select>
                        </label>
                        <label className="block col-span-2">
                          <span className="input-label">Chapter {loadingChapters && <span className="text-slate-500">(loading…)</span>}</span>
                          <select className="select-base" value={draft.chapter} onChange={(e) => updateDraft({ chapter: e.target.value })}>
                            <option value="" className="bg-slate-900 text-white">Pick a chapter…</option>
                            {chapterOptions.map((c) => <option key={c} value={c} className="bg-slate-900 text-white">{c}</option>)}
                          </select>
                        </label>
                        <div className="col-span-2">
                          <span className="input-label">Lecture status</span>
                          <div className="grid grid-cols-3 gap-1.5 mt-1">
                            {LECTURE_STATUS_OPTIONS.map((o) => (
                              <button
                                key={o.value} type="button" onClick={() => updateDraft({ lecture_status: o.value })}
                                className={`rounded-lg px-2 py-2 text-xs transition-colors ${draft.lecture_status === o.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="block">
                          <span className="input-label">Lectures remaining</span>
                          <input type="number" min={0} className="input-base" value={draft.pending_lectures} onChange={(e) => updateDraft({ pending_lectures: Number(e.target.value) })} />
                        </label>
                        <label className="block">
                          <span className="input-label">DPPs remaining</span>
                          <input type="number" min={0} className="input-base" value={draft.pending_dpps} onChange={(e) => updateDraft({ pending_dpps: Number(e.target.value) })} />
                        </label>
                        <label className="block">
                          <span className="input-label">PYQs remaining</span>
                          <input type="number" min={0} className="input-base" value={draft.pending_pyqs} onChange={(e) => updateDraft({ pending_pyqs: Number(e.target.value) })} />
                        </label>
                        <label className="block">
                          <span className="input-label">Module done (%)</span>
                          <input type="number" min={0} max={100} className="input-base" value={draft.module_pct ?? 0} onChange={(e) => updateDraft({ module_pct: Math.max(0, Math.min(100, Number(e.target.value))) })} />
                        </label>
                        <div className="col-span-2">
                          <span className="input-label">Revision needed</span>
                          <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {REVISION_LEVEL_OPTIONS.map((o) => (
                              <button
                                key={o.value} type="button" onClick={() => updateDraft({ revision_level: o.value })}
                                className={`rounded-lg px-2 py-2 text-xs transition-colors ${draft.revision_level === o.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="input-label">Confidence in this chapter (1 = weak, 5 = strong)</span>
                          <div className="flex gap-1.5 mt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n} type="button" onClick={() => updateDraft({ confidence: n })}
                                className={`flex-1 rounded-lg py-2 text-sm transition-colors ${draft.confidence === n ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={addBacklogItem}><Plus className="w-4 h-4" /> Add backlog</Button>
                      {form.backlogs.length > 0 && (
                        <ul className="space-y-1.5">
                          {form.backlogs.map((b, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                              <span className="truncate">{b.subject} — {b.chapter} (conf {b.confidence ?? 3}/5)</span>
                              <button type="button" onClick={() => removeBacklogItem(i)} className="text-slate-500 hover:text-red-400 shrink-0" aria-label="Remove backlog item">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* 16 — Weekly Tests */}
              {step === 15 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-400" /> Weekly Tests</h2>
                  <p className="text-xs text-slate-500">How many mock tests / weekly tests do you plan to attempt? The planner reserves a slot for each.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {TESTS_PER_WEEK_OPTIONS.map((t) => (
                      <button
                        key={t.value} type="button" onClick={() => update({ tests_per_week: Number(t.value) })}
                        className={`rounded-xl px-2 py-3 text-center text-sm transition-colors ${form.tests_per_week === Number(t.value) ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 17 — Goals */}
              {step === 16 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Flag className="w-4 h-4 text-accent-400" /> Primary Goal *</h2>
                  <div className="grid grid-cols-1 gap-2">
                    {PRIMARY_GOALS.map((g) => (
                      <button
                        key={g.value} type="button" onClick={() => update({ primary_goal: g.value })}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.primary_goal === g.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  {form.primary_goal === "custom" && (
                    <label className="block">
                      <span className="input-label">Your goal *</span>
                      <input className="input-base" value={form.custom_goal} onChange={(e) => update({ custom_goal: e.target.value })} placeholder="e.g. Crack NDA 2029" />
                    </label>
                  )}
                </>
              )}

              {/* 18 — AI Preferences */}
              {step === 17 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Languages className="w-4 h-4 text-accent-400" /> AI Preferences</h2>
                  <label className="block">
                    <span className="input-label">Preferred language</span>
                    <select className="select-base" value={form.preferred_language} onChange={(e) => update({ preferred_language: e.target.value })}>
                      {PREFERRED_LANGUAGES.map((l) => <option key={l.value} value={l.value} className="bg-slate-900 text-white">{l.label}</option>)}
                    </select>
                  </label>
                  <div>
                    <span className="input-label flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Preferred mentor tone</span>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {MENTOR_TONES.map((t) => (
                        <button
                          key={t.value} type="button" onClick={() => update({ mentor_tone: t.value })}
                          className={`rounded-xl px-3 py-2.5 text-center text-sm transition-colors ${form.mentor_tone === t.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-slate-400 space-y-1">
                    <p className="text-slate-300 font-medium">Your AI Planner will now:</p>
                    <p>• Block school hours ({form.school_days.length > 0 ? `${form.school_days.length} days, ${timeToDisplay(form.school_start)}–${timeToDisplay(form.school_end)}` : "no school days set"})</p>
                    <p>• Schedule hard tasks in your peak window ({SLOT_LABELS[form.productive_time] ?? "—"})</p>
                    <p>• Protect your sleep ({form.desired_sleep_hours || 8}h target)</p>
                    {form.tests_per_week > 0 && <p>• Reserve {form.tests_per_week >= 7 ? "daily" : `${form.tests_per_week} weekly`} test slot{form.tests_per_week === 1 ? "" : "s"}</p>}
                    {form.has_backlog && <p>• Chip away at {form.backlogs.length} backlog chapter{form.backlogs.length === 1 ? "" : "s"}</p>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 0 || saving}><ChevronLeft className="w-4 h-4" /> Back</Button>
            <Button size="sm" onClick={next} loading={saving} disabled={!canNext(step)}>
              {saving ? "Saving…" : isLast ? <><Check className="w-4 h-4" /> Finish</> : <>Next <ChevronRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
