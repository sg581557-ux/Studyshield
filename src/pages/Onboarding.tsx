import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, User, GraduationCap, Calendar, School, TrendingUp, Mic2,
  Clock, AlarmClock, Sunrise, BookOpen, ListTodo, Target, Languages, MessageSquare,
  ChevronRight, ChevronLeft, Check, Plus, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { db } from "../services/db";
import { Button } from "../components/ui";
import { friendlySaveError } from "../lib/authErrors";
import {
  TARGET_EXAMS, COACHING_OPTIONS, CURRENT_LEVELS, PRIMARY_GOALS,
  PREFERRED_LANGUAGES, MENTOR_TONES, SUBJECTS_BY_EXAM, ONBOARDING_STEP_COUNT,
  STUDY_TIME_BUCKETS, SESSION_LENGTHS, BREAK_OPTIONS, DAYS_OFF_OPTIONS,
  PRODUCTIVE_SLOTS, weekdayStudyHours,
  examIdForOnboarding,
} from "../lib/onboarding";
import { aliasExamId } from "../services/db";
import type { OnboardingInput, OnboardingBacklog } from "../lib/types";

const STEP_ICONS = [User, GraduationCap, Calendar, School, TrendingUp, Mic2, Clock, AlarmClock, Sunrise, BookOpen, ListTodo, Target, Languages];
const STEP_TITLES = [
  "Basic Details", "Target Exam", "Target Year", "School / College", "Current Level",
  "Coaching", "Daily Study Time", "Routine & Breaks", "Productive Slots",
  "Subjects", "Backlog", "Goals", "AI Preferences",
];

const emptyBacklog: OnboardingBacklog = {
  subject: "", chapter: "", pending_lectures: 0, pending_dpps: 0,
  module_remaining: 0, pending_pyqs: 0, revision_pending: 0,
};

function defaultForm(): OnboardingInput {
  return {
    full_name: "", age: "", school_class: "", target_exam: "", target_exam_other: "",
    exam_year: String(new Date().getFullYear() + 1), school_name: "", current_level: "",
    coaching: "none", coaching_other: "", daily_goal_hours: 6, wake_up_time: "06:00",
    sleep_time: "22:30", subjects: [], has_backlog: false, backlogs: [],
    primary_goal: "", custom_goal: "", preferred_language: "en", mentor_tone: "balanced",
    coaching_start: "16:00", coaching_end: "19:00",
    weekday_study_hours: "", custom_weekday_hours: 4,
    saturday_study_hours: 0, sunday_study_hours: 0,
    session_length_min: 45, break_min: 10, days_off: [], productive_slots: [],
  };
}

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const [step, setStep] = useState(() => {
    const saved = profile?.onboarding_step ?? 0;
    return saved > 0 && saved < ONBOARDING_STEP_COUNT ? saved : 0;
  });
  const [form, setForm] = useState<OnboardingInput>(() => {
    const saved = profile?.onboarding_data;
    if (saved && typeof saved === "object") {
      const merged = { ...defaultForm(), ...saved } as unknown as OnboardingInput;
      if (!Array.isArray(merged.subjects)) merged.subjects = [];
      if (!Array.isArray(merged.backlogs)) merged.backlogs = [];
      return merged;
    }
    return { ...defaultForm(), full_name: profile?.full_name ?? "" };
  });
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<OnboardingBacklog>({ ...emptyBacklog });

  function update(patch: Partial<OnboardingInput>) { setForm((p) => ({ ...p, ...patch })); }
  function updateDraft(patch: Partial<OnboardingBacklog>) { setDraft((p) => ({ ...p, ...patch })); }

  const examSubjects = useMemo(
    () => (form.target_exam ? SUBJECTS_BY_EXAM[form.target_exam] ?? SUBJECTS_BY_EXAM.Other : []),
    [form.target_exam],
  );

  function canNext(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: return form.full_name.trim().length > 0;
      case 1: return form.target_exam.trim().length > 0 && (form.target_exam !== "Other" || form.target_exam_other.trim().length > 0);
      case 2: return /^\d{4}$/.test(form.exam_year.trim());
      case 3: return true;
      case 4: return form.current_level.trim().length > 0;
      case 5: return true;
      case 6: return form.weekday_study_hours.trim().length > 0 && (form.weekday_study_hours !== "custom" || form.custom_weekday_hours >= 1);
      case 7: return !!form.wake_up_time && !!form.sleep_time && form.session_length_min > 0 && form.break_min > 0;
      case 8: return true;
      case 9: return form.subjects.length > 0;
      case 10: return !form.has_backlog || form.backlogs.length > 0;
      case 11: return form.primary_goal.trim().length > 0 && (form.primary_goal !== "custom" || form.custom_goal.trim().length > 0);
      case 12: return true;
      default: return true;
    }
  }

  function addBacklogItem() {
    if (!draft.subject.trim() || !draft.chapter.trim()) {
      toast.error("Enter a subject and chapter for the backlog item.");
      return;
    }
    setForm((p) => ({ ...p, backlogs: [...p.backlogs, { ...draft, subject: draft.subject.trim(), chapter: draft.chapter.trim() }] }));
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

  async function persistProgress(nextStep: number) {
    if (!user) return;
    const f = { ...form };
    try { await db.saveOnboardingProgress(user.id, nextStep, f); } catch { /* best effort */ }
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    try {
      await db.completeOnboarding(user.id, user.email ?? "", form);
      if (form.has_backlog && form.backlogs.length > 0) {
        await db.addOnboardingBacklogs(user.id, form.backlogs, aliasExamId(examIdForOnboarding(form.target_exam)));
      }
      await refreshProfile();
      if (profileRef.current?.onboarding_completed !== true) {
        throw new Error("Your profile didn't save. Please try again.");
      }
      toast.success("Profile set up!");
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error(friendlySaveError(err, "profiles"));
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (!canNext(step)) { toast.error("Please complete the required fields on this step."); return; }
    if (step < ONBOARDING_STEP_COUNT - 1) {
      const ns = step + 1;
      setStep(ns);
      void persistProgress(ns);
    } else {
      void finish();
    }
  }
  function back() {
    if (step > 0) { const ps = step - 1; setStep(ps); void persistProgress(ps); }
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
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
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
                    <label className="block">
                      <span className="input-label">Class / College Year</span>
                      <input className="input-base" value={form.school_class} onChange={(e) => update({ school_class: e.target.value })} placeholder="e.g. 12th / 1st year" />
                    </label>
                  </div>
                </>
              )}

              {/* 2 — Target Exam */}
              {step === 1 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><GraduationCap className="w-4 h-4 text-accent-400" /> Target Exam *</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {TARGET_EXAMS.map((ex) => (
                      <button
                        key={ex.value} type="button" onClick={() => update({ target_exam: ex.value })}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.target_exam === ex.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                  {form.target_exam === "Other" && (
                    <label className="block">
                      <span className="input-label">Which exam? *</span>
                      <input className="input-base" value={form.target_exam_other} onChange={(e) => update({ target_exam_other: e.target.value })} placeholder="Type your exam" />
                    </label>
                  )}
                </>
              )}

              {/* 3 — Target Year */}
              {step === 2 && (
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

              {/* 4 — School / College */}
              {step === 3 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><School className="w-4 h-4 text-accent-400" /> School / College</h2>
                  <p className="text-xs text-slate-500">Optional — helps us tailor your plan.</p>
                  <label className="block">
                    <span className="input-label">School / College name</span>
                    <input className="input-base" value={form.school_name} onChange={(e) => update({ school_name: e.target.value })} placeholder="e.g. Delhi Public School" />
                  </label>
                </>
              )}

              {/* 5 — Current Level */}
              {step === 4 && (
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

              {/* 6 — Coaching */}
              {step === 5 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Mic2 className="w-4 h-4 text-accent-400" /> Coaching</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {COACHING_OPTIONS.map((c) => (
                      <button
                        key={c.value} type="button" onClick={() => update({ coaching: c.value })}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${form.coaching === c.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  {form.coaching === "other" && (
                    <label className="block">
                      <span className="input-label">Which coaching?</span>
                      <input className="input-base" value={form.coaching_other} onChange={(e) => update({ coaching_other: e.target.value })} placeholder="Coaching name" />
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="input-label">Coaching / classes start</span>
                      <input type="time" className="input-base" value={form.coaching_start} onChange={(e) => update({ coaching_start: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="input-label">Coaching / classes end</span>
                      <input type="time" className="input-base" value={form.coaching_end} onChange={(e) => update({ coaching_end: e.target.value })} />
                    </label>
                  </div>
                </>
              )}

              {/* 7 — Daily Study Time */}
              {step === 6 && (
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
                  <p className="text-[11px] text-slate-500">Weekends usually differ — the planner uses these hours on Saturdays and Sundays.</p>
                </>
              )}

              {/* 8 — Routine & Breaks */}
              {step === 7 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><AlarmClock className="w-4 h-4 text-accent-400" /> Routine &amp; Breaks *</h2>
                  <p className="text-xs text-slate-500">Your usual routine — the planner works around it.</p>
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
                            key={d.value} type="button"
                            onClick={() => update({ days_off: active ? form.days_off.filter((v) => v !== d.value) : [...form.days_off, d.value] })}
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

              {/* 9 — Productive Slots */}
              {step === 8 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Sunrise className="w-4 h-4 text-accent-400" /> Productive Time Slots</h2>
                  <p className="text-xs text-slate-500">When do you focus best? The planner schedules hard tasks in your peak slots. Optional — pick any that apply.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCTIVE_SLOTS.map((s) => {
                      const active = form.productive_slots.includes(s.value);
                      return (
                        <button
                          key={s.value} type="button"
                          onClick={() => update({ productive_slots: active ? form.productive_slots.filter((v) => v !== s.value) : [...form.productive_slots, s.value] })}
                          className={`rounded-xl px-3 py-3 text-left text-sm transition-colors ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-300 hover:text-white"}`}
                        >
                          {active && <Check className="w-3.5 h-3.5 inline mr-1" />}{s.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* 10 — Subjects */}
              {step === 9 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-accent-400" /> Subjects *</h2>
                  <p className="text-xs text-slate-500">Select the subjects you're preparing for.</p>
                  <div className="flex flex-wrap gap-2">
                    {examSubjects.map((s) => {
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

              {/* 11 — Backlog */}
              {step === 10 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><ListTodo className="w-4 h-4 text-accent-400" /> Backlog</h2>
                  <p className="text-xs text-slate-500">Do you currently have backlogs (pending lectures / DPPs / modules)?</p>
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
                          <input className="input-base" value={draft.subject} onChange={(e) => updateDraft({ subject: e.target.value })} placeholder="e.g. Physics" list="ob-subjects" />
                          <datalist id="ob-subjects">{examSubjects.map((s) => <option key={s} value={s} />)}</datalist>
                        </label>
                        <label className="block col-span-2">
                          <span className="input-label">Chapter</span>
                          <input className="input-base" value={draft.chapter} onChange={(e) => updateDraft({ chapter: e.target.value })} placeholder="e.g. Thermodynamics" />
                        </label>
                        {([
                          ["pending_lectures", "Lectures remaining"],
                          ["pending_dpps", "DPPs remaining"],
                          ["module_remaining", "Module Qs remaining"],
                          ["pending_pyqs", "PYQs remaining"],
                          ["revision_pending", "Revision pending"],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="block">
                            <span className="input-label">{label}</span>
                            <input type="number" min={0} className="input-base" value={draft[key]} onChange={(e) => updateDraft({ [key]: Number(e.target.value) })} />
                          </label>
                        ))}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={addBacklogItem}><Plus className="w-4 h-4" /> Add backlog</Button>
                      {form.backlogs.length > 0 && (
                        <ul className="space-y-1.5">
                          {form.backlogs.map((b, i) => (
                            <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">
                              <span className="truncate">{b.subject} — {b.chapter}</span>
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

              {/* 12 — Goals */}
              {step === 11 && (
                <>
                  <h2 className="text-base font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-accent-400" /> Primary Goal *</h2>
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

              {/* 13 — AI Preferences */}
              {step === 12 && (
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
