import { useState } from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, Save, Sun, Moon, Monitor, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme, type Theme } from "../../context/ThemeContext";
import { db } from "../../services/db";
import { Card, CardBody, Button } from "../../components/ui";
import { STUDY_MODES } from "../../lib/constants";
import { examCategories, getExamsByCategory, getExamById } from "../../data/exams";
import { cn } from "../../lib/utils";
import type { StudyMode } from "../../lib/types";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun; desc: string }[] = [
  { value: "light", label: "Light", icon: Sun, desc: "Bright daytime theme" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
  { value: "system", label: "System", icon: Monitor, desc: "Follow OS setting" },
];

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [dailyHours, setDailyHours] = useState(profile?.daily_goal_hours ?? 6);
  const [studyMode, setStudyMode] = useState<StudyMode>((profile?.study_mode as StudyMode) ?? "balanced");
  const [targetExam, setTargetExam] = useState(profile?.target_exam ?? "");
  const [saving, setSaving] = useState(false);

  // Keep local state in sync when the profile (e.g. after onboarding) loads.
  // Render-phase adjustment keyed on the profile fields it mirrors — the form
  // resets in the same commit the profile lands, without an effect cascade.
  const profileKey = `${profile?.id ?? ""}|${profile?.full_name ?? ""}|${profile?.daily_goal_hours ?? ""}|${profile?.study_mode ?? ""}|${profile?.target_exam ?? ""}`;
  const [prevProfileKey, setPrevProfileKey] = useState(profileKey);
  if (prevProfileKey !== profileKey) {
    setPrevProfileKey(profileKey);
    setFullName(profile?.full_name ?? "");
    setDailyHours(profile?.daily_goal_hours ?? 6);
    setStudyMode((profile?.study_mode as StudyMode) ?? "balanced");
    setTargetExam(profile?.target_exam ?? "");
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      await db.updateAcademicSettings(profile.id, {
        full_name: fullName,
        display_name: fullName,
        daily_goal_hours: dailyHours,
        study_mode: studyMode,
        target_exam: targetExam || null,
      });
      await refreshProfile();
      toast.success("Settings saved");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const selectedExam = targetExam ? getExamById(targetExam) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-accent-400" /> Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Update your profile and study preferences.</p>
      </div>

      {/* Jump to Academic Preferences */}
      <Link
        to="/preferences"
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 hover:border-accent-500/40 px-4 py-3 text-left transition-colors"
      >
        <span className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-accent-400" />
          <span>
            <span className="block text-sm font-medium text-white">Academic Preferences</span>
            <span className="block text-xs text-slate-500 mt-0.5">Classes, coaching, chapters, planner weights, mock tests and more.</span>
          </span>
        </span>
        <span className="text-slate-500 text-sm">Open →</span>
      </Link>

      {/* Appearance — theme */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Appearance</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose how StudyShield looks. Your choice is saved and stays after refresh.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-left transition-all border",
                    active ? "border-accent-500 bg-accent-600/10" : "border-white/10 bg-white/5 hover:border-white/20",
                  )}
                >
                  <opt.icon className={cn("w-5 h-5 mb-2", active ? "text-accent-400" : "text-slate-400")} />
                  <div className="text-sm font-medium text-white">{opt.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Profile & study preferences */}
      <Card>
        <CardBody className="space-y-4">
          <label className="block">
            <span className="input-label">Full name</span>
            <input className="input-base" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>

          {/* Target exam — powers Formula Vault & Quick Revision personalization */}
          <label className="block">
            <span className="input-label flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Target exam
            </span>
            <select
              className="select-base"
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
            >
              <option value="" className="bg-slate-900 text-white">Not set — browse all formulas</option>
              {examCategories.map((cat) => {
                const exams = getExamsByCategory(cat);
                if (exams.length === 0) return null;
                return (
                  <optgroup key={cat} label={cat}>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id} className="bg-slate-900 text-white">{e.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {selectedExam
                ? `Formula Vault and Quick Revision will show formulas for ${selectedExam.name} by default.`
                : "Formula Vault and Quick Revision will show all formulas until an exam is set."}
            </span>
          </label>

          <label className="block">
            <span className="input-label">Daily study goal (hours)</span>
            <input type="number" min="1" max="16" className="input-base" value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} />
          </label>
          <div>
            <span className="input-label">Study mode</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {STUDY_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setStudyMode(m.value)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-left text-xs transition-all",
                    studyMode === m.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10",
                  )}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="opacity-70 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} loading={saving}>
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
