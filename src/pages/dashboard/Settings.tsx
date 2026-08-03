import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, Sun, Moon, Monitor, GraduationCap, Mic, Volume2, Languages, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme, type Theme } from "../../context/ThemeContext";
import { useVoice } from "../../context/VoiceContext";
import { db } from "../../services/db";
import { Card, CardBody, Button } from "../../components/ui";
import { STUDY_MODES } from "../../lib/constants";
import { examCatalog, examCategories, getExamsByCategory, getExamById } from "../../data/exams";
import { cn } from "../../lib/utils";
import type { StudyMode } from "../../lib/types";
import type { VoiceOption } from "../../services/speech";
import { PERSONALITIES, PERSONALITY_ORDER, type VoicePersonality } from "../../services/speech/personalities";
import { VOICE_LANGUAGES } from "../../services/speech/languages";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun; desc: string }[] = [
  { value: "light", label: "Light", icon: Sun, desc: "Bright daytime theme" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
  { value: "system", label: "System", icon: Monitor, desc: "Follow OS setting" },
];

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-slate-300">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0", checked ? "bg-accent-600" : "bg-white/10")}
      >
        <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { settings: voice, updateSettings: updateVoice, engine, supported: voiceSupported } = useVoice();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [dailyHours, setDailyHours] = useState(profile?.daily_goal_hours ?? 6);
  const [studyMode, setStudyMode] = useState<StudyMode>((profile?.study_mode as StudyMode) ?? "balanced");
  const [targetExam, setTargetExam] = useState(profile?.target_exam ?? "");
  const [saving, setSaving] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>(engine.listVoices());

  // Voices load asynchronously in Chrome; refresh whenever they change.
  useEffect(() => {
    const refresh = () => setVoices(engine.listVoices());
    refresh();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = refresh;
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [engine]);

  const testVoice = () => {
    const ok = engine.speak("Hello! I'm your StudyShield voice mentor. This is how I'll read answers to you.", {
      style: { personality: voice.voicePersonality },
    });
    if (!ok) toast.error("Voice output isn't available in this browser.");
    else toast.success("Speaking…");
  };

  // Keep local state in sync when the profile (e.g. after onboarding) loads.
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setDailyHours(profile?.daily_goal_hours ?? 6);
    setStudyMode((profile?.study_mode as StudyMode) ?? "balanced");
    setTargetExam(profile?.target_exam ?? "");
  }, [profile?.id, profile?.full_name, profile?.daily_goal_hours, profile?.study_mode, profile?.target_exam]);

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

      {/* Voice Mentor */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-accent-400" /> Voice Mentor
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Talk to the AI Mentor with your microphone. Works in Chrome and Edge; falls back to typing elsewhere.</p>
          </div>
          {!voiceSupported ? (
            <p className="text-xs text-slate-400 bg-white/5 rounded-xl px-3 py-2">
              Your browser doesn't support the Web Speech API — the mentor will use text chat instead. Try Chrome or Edge.
            </p>
          ) : (
            <>
              <ToggleRow
                label="Auto-read responses"
                desc="Read the mentor's reply aloud after it's generated"
                checked={voice.autoRead}
                onChange={(v) => updateVoice({ autoRead: v })}
              />
              <ToggleRow
                label="Auto-send after silence"
                desc="Send your question automatically when you stop speaking (off = review the transcript first)"
                checked={voice.autoSend}
                onChange={(v) => updateVoice({ autoSend: v })}
              />
              <label className="block">
                <span className="input-label flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5" /> Voice language
                </span>
                <select
                  className="select-base"
                  value={voice.voiceLanguage}
                  onChange={(e) => updateVoice({ voiceLanguage: e.target.value })}
                >
                  {VOICE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                      {l.code === "auto" ? `${l.label} — let me detect it` : `${l.label} (${l.native})`}
                    </option>
                  ))}
                </select>
              </label>
              <ToggleRow
                label="Auto-detect language"
                desc="Switch between English, Hindi, Hinglish and 9 more languages as you speak"
                checked={voice.autoDetectLanguage}
                onChange={(v) => updateVoice({ autoDetectLanguage: v })}
              />
              <ToggleRow
                label="Auto-start listening"
                desc="Open the mic again by itself after each reply in Voice Mentor"
                checked={voice.autoStartListening}
                onChange={(v) => updateVoice({ autoStartListening: v })}
              />
              <ToggleRow
                label="Auto interrupt"
                desc="Stop the reply instantly when you start talking — no need to tap"
                checked={voice.autoInterrupt}
                onChange={(v) => updateVoice({ autoInterrupt: v })}
              />
              <ToggleRow
                label="Noise suppression"
                desc="Filter background noise and echo from your microphone"
                checked={voice.noiseSuppression}
                onChange={(v) => updateVoice({ noiseSuppression: v })}
              />
              <div>
                <div className="flex items-center justify-between">
                  <span className="input-label flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" /> Voice volume
                  </span>
                  <span className="text-xs text-accent-400 font-medium">{Math.round(voice.voiceVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={voice.voiceVolume}
                  onChange={(e) => updateVoice({ voiceVolume: Number(e.target.value) })}
                  className="w-full accent-accent-500"
                />
              </div>
              <label className="block">
                <span className="input-label">Voice style</span>
                <select
                  className="select-base"
                  value={voice.voiceStyle}
                  onChange={(e) => updateVoice({ voiceStyle: e.target.value as "auto" | "male" | "female" })}
                >
                  <option value="auto" className="bg-slate-900 text-white">Auto (best available)</option>
                  <option value="male" className="bg-slate-900 text-white">Male</option>
                  <option value="female" className="bg-slate-900 text-white">Female</option>
                </select>
              </label>
              <label className="block">
                <span className="input-label">Voice personality</span>
                <select
                  className="select-base"
                  value={voice.voiceFamily}
                  onChange={(e) => updateVoice({ voiceFamily: e.target.value as "auto" | "google" | "microsoft" })}
                >
                  <option value="auto" className="bg-slate-900 text-white">Auto — natural voice per language</option>
                  <option value="google" className="bg-slate-900 text-white">Google — same family in every language</option>
                  <option value="microsoft" className="bg-slate-900 text-white">Microsoft — same family in every language</option>
                </select>
              </label>
              <div>
                <span className="input-label flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Mentor personality
                </span>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">
                  How the mentor's voice sounds. The tone also adapts automatically — encouraging when you fall behind, celebratory when you complete goals, calm when you're stressed.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PERSONALITY_ORDER.map((id) => {
                    const p = PERSONALITIES[id];
                    const active = voice.voicePersonality === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateVoice({ voicePersonality: id as VoicePersonality })}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-left text-xs transition-all border",
                          active
                            ? "bg-accent-600/20 border-accent-500/50 text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
                        )}
                      >
                        <div className="font-medium flex items-center gap-1.5">
                          {p.label}
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />}
                        </div>
                        <div className="opacity-70 mt-1 leading-relaxed">{p.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="input-label">Voice speed</span>
                  <span className="text-xs text-accent-400 font-medium">{voice.speechRate.toFixed(1)}×</span>
                </div>
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {[0.8, 1.0, 1.15, 1.25, 1.4].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => updateVoice({ speechRate: rate })}
                      className={cn(
                        "text-xs rounded-full px-3 py-1 border transition-colors",
                        Math.abs(voice.speechRate - rate) < 0.01
                          ? "bg-accent-600/20 border-accent-500/50 text-accent-300"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white",
                      )}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={voice.speechRate}
                  onChange={(e) => updateVoice({ speechRate: Number(e.target.value) })}
                  className="w-full accent-accent-500"
                />
              </div>
              <label className="block">
                <span className="input-label">Preferred voice</span>
                <select
                  className="select-base"
                  value={voice.preferredVoiceURI ?? ""}
                  onChange={(e) => updateVoice({ preferredVoiceURI: e.target.value || null })}
                  disabled={voiceSupported && voices.length === 0}
                >
                  <option value="" className="bg-slate-900 text-white">
                    {voiceSupported && voices.length === 0 ? "Loading voices…" : "Best natural voice (recommended)"}
                  </option>
                  {voices.map((v) => (
                    <option key={v.uri} value={v.uri} className="bg-slate-900 text-white">
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sorted best quality first — natural voices on top, robotic ones at the bottom. Leave on default to get the best natural voice automatically.
                </span>
              </label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={testVoice}>
                  <Volume2 className="w-4 h-4" /> Test voice
                </Button>
                <span className="text-[11px] text-slate-600">Press Alt+M in the Mentor chat to start/stop talking.</span>
              </div>
            </>
          )}
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
