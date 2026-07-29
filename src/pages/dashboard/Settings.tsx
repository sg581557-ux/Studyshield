import { useState } from "react";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button } from "../../components/ui";
import { STUDY_MODES } from "../../lib/constants";
import type { StudyMode } from "../../lib/types";

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [dailyHours, setDailyHours] = useState(profile?.daily_goal_hours ?? 6);
  const [studyMode, setStudyMode] = useState<StudyMode>((profile?.study_mode as StudyMode) ?? "balanced");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    try { await db.updateAcademicSettings(profile.id, { full_name: fullName, display_name: fullName, daily_goal_hours: dailyHours, study_mode: studyMode }); await refreshProfile(); toast.success("Settings saved"); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-semibold text-white flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-accent-400" /> Settings</h1><p className="text-sm text-slate-500 mt-0.5">Update your profile and study preferences.</p></div>
      <Card><CardBody className="space-y-4">
        <label className="block"><span className="input-label">Full name</span><input className="input-base" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="block"><span className="input-label">Daily study goal (hours)</span><input type="number" min="1" max="16" className="input-base" value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} /></label>
        <div><span className="input-label">Study mode</span><div className="grid grid-cols-2 gap-2 mt-1">{STUDY_MODES.map((m) => <button key={m.value} type="button" onClick={() => setStudyMode(m.value)} className={`rounded-xl px-3 py-2 text-left text-xs ${studyMode === m.value ? "bg-accent-600 text-white" : "bg-white/5 text-slate-400"}`}><div className="font-medium">{m.label}</div><div className="opacity-70 mt-0.5">{m.desc}</div></button>)}</div></div>
        <Button onClick={save} loading={saving}><Save className="w-4 h-4" /> Save changes</Button>
      </CardBody></Card>
    </div>
  );
}
