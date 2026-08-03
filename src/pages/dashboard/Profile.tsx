import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Mail, Target, Calendar, Flame, Sparkles, Save, GraduationCap, Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { db } from "../../services/db";
import { Card, CardBody, Button } from "../../components/ui";
import { levelFromXP } from "../../lib/constants";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  const lvl = levelFromXP(profile?.xp ?? 0);
  const email = user?.email ?? profile?.email ?? "";
  const initials = (fullName || email || "S")
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "—";
  const exam = profile?.target_exam
    ? getExamLabel(profile.target_exam)
    : "Not set";
  const examYear = profile?.exam_year ?? "—";

  function getExamLabel(value: string): string {
    const map: Record<string, string> = {
      jee: "JEE (Main + Advanced)", JEE: "JEE (Main + Advanced)",
      neet: "NEET", NEET: "NEET",
      cbse: "CBSE Boards", CBSE: "CBSE Boards",
      olympiad: "Olympiad", Olympiad: "Olympiad",
      nda: "NDA", NDA: "NDA",
      cuet: "CUET", CUET: "CUET",
      gate: "GATE", GATE: "GATE",
      ssc: "SSC", SSC: "SSC",
      cat: "CAT", CAT: "CAT",
      commerce: "Commerce", Commerce: "Commerce",
      upsc: "UPSC", UPSC: "UPSC",
      other: "Other", Other: "Other",
      custom: "Custom", Custom: "Custom",
    };
    return map[value] ?? value;
  }

  async function save() {
    if (!profile) return;
    const name = fullName.trim();
    if (!name) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await db.upsertProfile({ id: profile.id, full_name: name, display_name: name });
      await refreshProfile();
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  const stats = [
    { label: "Level", value: String(lvl.level), icon: <Sparkles className="w-4 h-4" />, color: "text-accent-400" },
    { label: "XP", value: String(profile?.xp ?? 0), icon: <Flame className="w-4 h-4" />, color: "text-warning-400" },
    { label: "Streak", value: `${profile?.longest_streak ?? 0} days`, icon: <Clock className="w-4 h-4" />, color: "text-success-400" },
    { label: "Daily goal", value: `${profile?.daily_goal_hours ?? 0}h`, icon: <Target className="w-4 h-4" />, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-accent-400" /> Profile
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Your StudyShield identity and stats at a glance.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-600 to-purple-600 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {initials || <User className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{fullName || "Student"}</h2>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
              <Mail className="w-3.5 h-3.5 shrink-0" /> {email}
            </p>
            <p className="text-xs text-slate-600 mt-1">Member since {memberSince}</p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="text-center py-4">
              <p className={`${s.color} flex items-center justify-center mb-1.5`}>{s.icon}</p>
              <p className="text-lg font-bold text-white truncate">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-accent-400" /> Study details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Set from your onboarding questionnaire.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Target exam</p>
              <p className="text-sm text-slate-200 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent-400" /> {exam}</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Exam year</p>
              <p className="text-sm text-slate-200 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-accent-400" /> {examYear}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Edit name</h2>
            <p className="text-xs text-slate-500 mt-0.5">Shown on your dashboard and mentor check-ins.</p>
          </div>
          <label className="block">
            <span className="input-label">Full name</span>
            <input
              className="input-base"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <div className="flex items-center gap-3">
            <Button onClick={save} loading={saving} disabled={!fullName.trim()}>
              {saving ? "Saving…" : <><Save className="w-4 h-4" /> Save changes</>}
            </Button>
            <Link to="/settings" className="text-xs text-accent-400 hover:underline">
              More options in Settings →
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
