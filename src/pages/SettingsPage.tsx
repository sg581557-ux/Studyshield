import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";
import { Settings, User, Target, Clock, Shield, LogOut, Loader2, Check } from "lucide-react";

export default function SettingsPage() {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [targetExam, setTargetExam] = useState(profile?.target_exam || "");
  const [studyMode, setStudyMode] = useState(profile?.study_mode || "balanced");
  const [dailyHours, setDailyHours] = useState(Number(profile?.daily_goal_hours) || 4);
  const [motivation, setMotivation] = useState(profile?.motivation_quote || "");

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: session.user.id,
      display_name: displayName,
      target_exam: targetExam,
      study_mode: studyMode,
      daily_goal_hours: dailyHours,
      motivation_quote: motivation,
    });
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" /> Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-400" /> Profile
        </h2>
        <div>
          <label className="label">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Email</label>
          <input value={profile?.email || ""} disabled className="input bg-slate-50 text-slate-500" />
        </div>
        <div>
          <label className="label">Motivation Quote</label>
          <input
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            className="input"
            placeholder="Your daily motivation..."
          />
        </div>
      </div>

      {/* Study preferences */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-slate-400" /> Study Preferences
        </h2>
        <div>
          <label className="label">Target Exam</label>
          <input value={targetExam} onChange={(e) => setTargetExam(e.target.value)} className="input" placeholder="e.g., JEE Advanced" />
        </div>
        <div>
          <label className="label">Study Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "balanced", label: "Balanced" },
              { id: "hard_push", label: "Hard Push" },
              { id: "recovery", label: "Recovery" },
              { id: "exam_sprint", label: "Exam Sprint" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setStudyMode(m.id)}
                className={cn(
                  "px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                  studyMode === m.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Daily Goal: {dailyHours} hours
          </label>
          <input
            type="range"
            min="1"
            max="12"
            step="0.5"
            value={dailyHours}
            onChange={(e) => setDailyHours(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
        </div>
      </div>

      {/* Account */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" /> Account
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Account type</p>
            <p className="text-xs text-slate-500">{profile?.is_premium ? "Premium" : "Free"}</p>
          </div>
          {profile?.is_admin && (
            <span className="badge bg-brand-100 text-brand-700">Admin</span>
          )}
        </div>
        <button onClick={handleSignOut} className="btn-danger w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : saved ? (
          <><Check className="w-4 h-4" /> Saved!</>
        ) : (
          "Save Changes"
        )}
      </button>
    </div>
  );
}
