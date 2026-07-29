import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, GraduationCap, Calendar, BookOpen, School, Mic2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { db } from "../services/db";
import { Button } from "../components/ui";
import { STUDY_MODES } from "../lib/constants";
import type { SyllabusExam, OnboardingInput, StudyMode } from "../lib/types";

const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Other"];
const COACHING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OnboardingInput>({
    full_name: "", target_exam: "", exam_year: String(new Date().getFullYear() + 1),
    school_board: "CBSE", school_class: "12", attends_school: true,
    coaching_enabled: false, coaching_name: "", coaching_is_live: false,
    coaching_days: [], coaching_start: "16:00", coaching_end: "19:00",
    lecture_duration_min: 120, revision_time: "evening", daily_goal_hours: 6, study_mode: "balanced",
  });
  const [exams, setExams] = useState<SyllabusExam[]>([]);
  useEffect(() => { db.getExams().then(setExams).catch(() => setExams([])); }, []);

  function update(patch: Partial<OnboardingInput>) { setForm((p) => ({ ...p, ...patch })); }
  const steps = ["Account", "Exam", "School", "Coaching", "Goals"];
  const canNext = step === 0 ? form.full_name.trim().length > 0 : step === 1 ? !!form.target_exam : true;

  async function finish() {
    if (!user) return;
    setSaving(true);
    try { await db.completeOnboarding(user.id, form); await refreshProfile(); toast.success("Profile set up!"); navigate("/app"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save profile"); }
    finally { setSaving(false); }
  }
  function next() { if (step < steps.length - 1) setStep(step + 1); else finish(); }
  function back() { if (step > 0) setStep(step - 1); }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-950">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-accent-600/20 flex items-center justify-center mb-3"><ShieldCheck className="w-6 h-6 text-accent-400" /></div>
          <h1 className="text-xl font-semibold text-white">Welcome to StudyShield</h1>
          <p className="text-xs text-slate-500 mt-1">Let's set up your study profile</p>
        </div>
        <div className="flex items-center gap-1.5 mb-4">{steps.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent-500" : "bg-white/10"}`} />)}</div>
        <div className="rounded-2xl bg-ink-900 border border-white/10 p-5 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {step === 0 && (<><h2 className="text-base font-semibold text-white">Account</h2><label className="block"><span className="input-label">Full name</span><input className="input-base" value={form.full_name} onChange={(e) => update({ full_name: e.target.value })} placeholder="Your name" /></label><label className="block"><span className="input-label">Email</span><input className="input-base opacity-60" value={user?.email ?? ""} disabled /></label></>)}
              {step === 1 && (<><h2 className="text-base font-semibold text-white">Exam</h2><label className="block"><span className="input-label flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Target exam</span><select className="select-base" value={form.target_exam} onChange={(e) => update({ target_exam: e.target.value })}><option value="" className="bg-slate-900 text-white">Select…</option>{exams.map((x) => <option key={x.id} value={x.id} className="bg-slate-900 text-white">{x.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="input-label flex items-center gap-1"><Calendar className="w-3 h-3" /> Exam year</span><input type="number" className="input-base" value={form.exam_year} onChange={(e) => update({ exam_year: e.target.value })} /></label><label className="block"><span className="input-label flex items-center gap-1"><BookOpen className="w-3 h-3" /> Class</span><input className="input-base" value={form.school_class} onChange={(e) => update({ school_class: e.target.value })} /></label></div><label className="block"><span className="input-label">Board</span><select className="select-base" value={form.school_board} onChange={(e) => update({ school_board: e.target.value })}>{BOARDS.map((b) => <option key={b} className="bg-slate-900 text-white">{b}</option>)}</select></label></>)}
              {step === 2 && (<><h2 className="text-base font-semibold text-white">School</h2><label className="flex items-center gap-2 cursor-pointer rounded-xl bg-white/5 p-3"><input type="checkbox" checked={form.attends_school} onChange={(e) => update({ attends_school: e.target.checked })} className="accent-accent-600" /><span className="text-sm text-slate-300 flex items-center gap-1"><School className="w-4 h-4 text-slate-500" /> I attend school</span></label></>)}
              {step === 3 && (<><h2 className="text-base font-semibold text-white">Coaching</h2><label className="flex items-center gap-2 cursor-pointer rounded-xl bg-white/5 p-3"><input type="checkbox" checked={form.coaching_enabled} onChange={(e) => update({ coaching_enabled: e.target.checked })} className="accent-accent-600" /><span className="text-sm text-slate-300 flex items-center gap-1"><Mic2 className="w-4 h-4 text-slate-500" /> I attend online coaching</span></label>{form.coaching_enabled && (<div className="space-y-3 pl-2 border-l border-white/10"><label className="block"><span className="input-label">Coaching name</span><input className="input-base" value={form.coaching_name} onChange={(e) => update({ coaching_name: e.target.value })} /></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.coaching_is_live} onChange={(e) => update({ coaching_is_live: e.target.checked })} className="accent-accent-600" /><span className="text-sm text-slate-300">Live (not recorded)</span></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="input-label">Start</span><input type="time" className="input-base" value={form.coaching_start} onChange={(e) => update({ coaching_start: e.target.value })} /></label><label className="block"><span className="input-label">End</span><input type="time" className="input-base" value={form.coaching_end} onChange={(e) => update({ coaching_end: e.target.value })} /></label></div><label className="block"><span className="input-label">Lecture duration (min)</span><input type="number" className="input-base" value={form.lecture_duration_min} onChange={(e) => update({ lecture_duration_min: Number(e.target.value) })} /></label><div><span className="input-label">Coaching days</span><div className="flex flex-wrap gap-2 mt-1">{COACHING_DAYS.map((d) => { const active = form.coaching_days.includes(d); return <button key={d} type="button" onClick={() => update({ coaching_days: active ? form.coaching_days.filter((x) => x !== d) : [...form.coaching_days, d] })} className={`rounded-full px-3 py-1 text-xs ${active ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400"}`}>{d}</button>; })}</div></div></div>)}</>)}
              {step === 4 && (<><h2 className="text-base font-semibold text-white">Goals</h2><label className="block"><span className="input-label">Daily study goal (hours)</span><input type="number" min="1" max="16" className="input-base" value={form.daily_goal_hours} onChange={(e) => update({ daily_goal_hours: Number(e.target.value) })} /></label><div><span className="input-label">Study mode</span><div className="grid grid-cols-2 gap-2 mt-1">{STUDY_MODES.map((m) => <button key={m.value} type="button" onClick={() => update({ study_mode: m.value as StudyMode })} className={`rounded-xl px-3 py-2 text-left text-xs ${form.study_mode === m.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400"}`}><div className="font-medium">{m.label}</div><div className="opacity-70 mt-0.5">{m.desc}</div></button>)}</div></div><label className="block"><span className="input-label">Best revision time</span><select className="select-base" value={form.revision_time} onChange={(e) => update({ revision_time: e.target.value })}><option value="morning" className="bg-slate-900 text-white">Morning</option><option value="afternoon" className="bg-slate-900 text-white">Afternoon</option><option value="evening" className="bg-slate-900 text-white">Evening</option><option value="night" className="bg-slate-900 text-white">Night</option></select></label></>)}
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center justify-between mt-6">
            <Button variant="ghost" size="sm" onClick={back} disabled={step === 0}><ChevronLeft className="w-4 h-4" /> Back</Button>
            <span className="text-xs text-slate-600">{step + 1} / {steps.length}</span>
            <Button size="sm" onClick={next} loading={saving} disabled={!canNext}>{step === steps.length - 1 ? <><Check className="w-4 h-4" /> Finish</> : <>Next <ChevronRight className="w-4 h-4" /></>}</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
