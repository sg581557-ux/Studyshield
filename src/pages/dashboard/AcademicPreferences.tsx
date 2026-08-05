import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, School, Video, Timer, BookOpen, ListChecks, Sparkles,
  ClipboardList, Bell, Palette, Search, Save, ChevronDown, Plus, Trash2,
  RotateCcw, CheckCircle2, Loader2, ArrowLeft, Sun, Moon, Monitor,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme, ACCENTS, type Theme } from "../../context/ThemeContext";
import { db } from "../../services/db";
import { Button, Card } from "../../components/ui";
import { cn } from "../../lib/utils";
import {
  STREAMS, SCHOOL_CLASSES, SCHOOL_BOARDS, TARGET_EXAMS, HOW_STUDY_OPTIONS,
  COACHING_NAME_OPTIONS, CLASS_MODE_OPTIONS, LECTURE_DURATION_OPTIONS,
  PRODUCTIVE_SLOTS, SLEEP_GOAL_OPTIONS, TESTS_PER_WEEK_OPTIONS,
  SESSION_LENGTHS, BREAK_OPTIONS, PREFERRED_LANGUAGES, chaptersForSubject,
} from "../../lib/onboarding";
import {
  WEEKDAYS, WEEKDAY_LABELS, YEARS, PLANNER_STYLES, TIME_FORMATS, DATE_FORMATS,
  MOCK_DURATIONS, DEFAULT_PRIORITY_WEIGHTS, DEFAULT_NOTIFICATION_PREFS,
  DEFAULT_MOCK_ANALYSIS_PREFS, NOTIFICATION_FIELDS, validateProfileSettings,
  normalizeTime, clampNumInRange,
} from "../../lib/settings";
import type {
  Profile, UserChapter, BacklogItem, ChapterProgressPatch,
  ClassScheduleEntry, PriorityWeights, Priority, BacklogDifficulty, ChapterStatus,
} from "../../lib/types";

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface SectionDef {
  id: string;
  icon: typeof GraduationCap;
  title: string;
  desc: string;
  keywords: string;
}

const SECTIONS: SectionDef[] = [
  { id: "academic", icon: GraduationCap, title: "Academic Information", desc: "Name, class, stream, board, school and target exam.", keywords: "full name class stream board school exam year" },
  { id: "school", icon: School, title: "School Schedule", desc: "School days, timings and holidays.", keywords: "school days start end holidays timetable" },
  { id: "coaching", icon: Video, title: "Coaching", desc: "Mode, coaching name, live/recorded classes.", keywords: "coaching online offline hybrid live recorded lecture duration" },
  { id: "study", icon: Timer, title: "Study Preferences", desc: "Daily hours, productive time, sleep, breaks.", keywords: "study hours productive night owl sleep wake break session revision" },
  { id: "chapters", icon: BookOpen, title: "Subjects & Chapters", desc: "Add, edit, complete or reset chapter progress.", keywords: "subjects chapters progress lecture module dpp pyq revision confidence" },
  { id: "backlog", icon: ListChecks, title: "Backlog Preferences", desc: "Priority, difficulty and pending work per backlog item.", keywords: "backlog priority difficulty lectures questions revision tests" },
  { id: "planner", icon: Sparkles, title: "AI Planner Preferences", desc: "Planner style, daily caps, ratios and priority weights.", keywords: "planner ai style hours max min revision practice ratio weights rest day" },
  { id: "mocks", icon: ClipboardList, title: "Mock Test Preferences", desc: "Weekly tests, duration, test day and analysis.", keywords: "mock test weekly duration day analysis" },
  { id: "notifications", icon: Bell, title: "Notifications", desc: "Study, revision, mock, goal and sleep reminders.", keywords: "notifications reminders alert" },
  { id: "personal", icon: Palette, title: "Personalization", desc: "Theme, accent color, language, time and date formats.", keywords: "theme accent color language time date format appearance" },
];

type SavingKey = string | null;

function draftFromProfile(p: Profile | null) {
  const weights: PriorityWeights = {
    backlog: p?.priority_weights?.backlog ?? DEFAULT_PRIORITY_WEIGHTS.backlog,
    lecture: p?.priority_weights?.lecture ?? DEFAULT_PRIORITY_WEIGHTS.lecture,
    practice: p?.priority_weights?.practice ?? DEFAULT_PRIORITY_WEIGHTS.practice,
    mock: p?.priority_weights?.mock ?? DEFAULT_PRIORITY_WEIGHTS.mock,
  };
  return {
    full_name: p?.full_name ?? "",
    school_class: p?.school_class ?? p?.class ?? "12",
    stream: p?.stream ?? "",
    board: p?.board ?? "",
    school_name: p?.school_name ?? "",
    target_exam: p?.target_exam ?? "",
    target_year: p?.target_year ?? p?.exam_year ?? "",
    school_days: p?.school_days ?? [],
    school_start: p?.school_start ?? "",
    school_end: p?.school_end ?? "",
    school_holidays: p?.school_holidays ?? [],
    coaching_mode: p?.coaching_mode ?? "",
    coaching_name: p?.coaching_name ?? "",
    class_mode: p?.class_mode ?? "live",
    class_schedule: (p?.class_schedule ?? []) as ClassScheduleEntry[],
    lectures_per_day: p?.lectures_per_day ?? 1,
    lecture_duration: p?.lecture_duration ?? p?.lecture_duration_min ?? 60,
    daily_goal_hours: p?.daily_goal_hours ?? 6,
    productive_time: p?.productive_time ?? "",
    night_owl_mode: p?.night_owl_mode ?? false,
    sleep_time: p?.sleep_time ?? "22:30",
    wake_up_time: p?.wake_up_time ?? "06:30",
    break_min: p?.break_min ?? 10,
    session_length_min: p?.session_length_min ?? 45,
    revision_time: p?.revision_time ?? "",
    desired_sleep_hours: p?.desired_sleep_hours ?? null,
    planner_style: p?.ai_planning_style ?? "balanced",
    max_daily_study_hours: p?.max_daily_study_hours ?? null,
    min_daily_study_hours: p?.min_daily_study_hours ?? null,
    practice_revision_ratio: p?.practice_revision_ratio ?? 75,
    priority_weights: weights,
    days_off: p?.days_off ?? [],
    tests_per_week: p?.tests_per_week ?? 0,
    test_duration_min: p?.test_duration_min ?? 120,
    preferred_test_day: p?.preferred_test_day ?? "",
    mock_analysis_prefs: { ...DEFAULT_MOCK_ANALYSIS_PREFS, ...(p?.mock_analysis_prefs ?? {}) } as Record<string, boolean>,
    notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(p?.notification_prefs ?? {}) } as Record<string, boolean>,
    preferred_language: p?.preferred_language ?? "en",
    time_format: p?.time_format ?? "12h",
    date_format: p?.date_format ?? "dmy",
  };
}

type Draft = ReturnType<typeof draftFromProfile>;

function MultiChip({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "text-xs rounded-full px-3 py-1.5 border transition-colors",
              on ? "bg-accent-600 text-white border-accent-600" : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="input-label">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-slate-500 mt-1 block">{hint}</span>}
    </label>
  );
}

function Section({
  def, open, onToggle, search, children,
}: {
  def: SectionDef;
  open: boolean;
  onToggle: () => void;
  search: string;
  children: React.ReactNode;
}) {
  const q = search.trim().toLowerCase();
  const match = !q || [def.title, def.desc, def.keywords].some((s) => s.toLowerCase().includes(q));
  if (!match) return null;
  const Icon = def.icon;
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 md:px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent-600/15 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5 w-5 h-5 text-accent-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{def.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{def.desc}</p>
          </div>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-500 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 md:px-5 py-4 space-y-4">{children}</div>
      )}
    </Card>
  );
}

export default function AcademicPreferences() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, accent, setAccent } = useTheme();

  const [draft, setDraft] = useState<Draft>(() => draftFromProfile(profile));
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ academic: true }));
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<SavingKey>(null);

  // Chapters & backlog (DB-backed, separate from profile).
  const [chapters, setChapters] = useState<UserChapter[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [rowSaving, setRowSaving] = useState<string | null>(null);

  // Reset the draft when the profile identity changes (e.g. a fresh login
  // or account switch). Render-phase adjustment so the reset commits with
  // the profile swap; the initial draft is seeded in the useState initializer.
  const [prevProfileId, setPrevProfileId] = useState<string | undefined>(profile?.id);
  if (prevProfileId !== profile?.id) {
    setPrevProfileId(profile?.id);
    setDraft(draftFromProfile(profile));
  }

  useEffect(() => {
    (async () => {
      setLoadingRows(true);
      const [uc, bl] = await Promise.all([
        db.getUserChapters().catch(() => [] as UserChapter[]),
        db.getBacklogItems(profile?.target_exam).catch(() => [] as BacklogItem[]),
      ]);
      setChapters(uc);
      setBacklogItems(bl);
      setLoadingRows(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function savePatch(label: string, patch: Partial<Profile> | Record<string, unknown>) {
    if (!profile) return;
    setSaving(label);
    try {
      await db.updateAcademicSettings(profile.id, patch as Partial<Profile>);
      await refreshProfile();
      toast.success(`${label} saved`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${label}`);
    } finally {
      setSaving(null);
    }
  }

  async function saveSection(label: string, buildPatch: () => Record<string, unknown> | null) {
    const patch = buildPatch();
    if (!patch) return;
    await savePatch(label, patch);
  }

  const q = search.trim().toLowerCase();
  const isSectionOpen = (def: SectionDef) => (q ? [def.title, def.desc, def.keywords].some((s) => s.toLowerCase().includes(q)) : open[def.id]);
  const toggleSection = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const subjects = useMemo(() => {
    const list = new Set<string>([...(profile?.subjects ?? []), ...chapters.map((c) => c.subject)]);
    return [...list].sort((a, b) => a.localeCompare(b));
  }, [profile?.subjects, chapters]);

  const chapterCatalog = useMemo(
    () => chaptersForSubject("Physics", profile?.school_class ?? "12", profile?.stream ?? "other").slice(0, 40),
    [profile?.school_class, profile?.stream],
  );

  const weightSum =
    (draft.priority_weights.backlog ?? 0) + (draft.priority_weights.lecture ?? 0) +
    (draft.priority_weights.practice ?? 0) + (draft.priority_weights.mock ?? 0);

  // ---- Chapter row editing -------------------------------------------------
  function chapterKey(c: { subject: string; chapter: string }) {
    return `${c.subject}|${c.chapter}`;
  }

  async function applyChapterAction(label: string, patch: ChapterProgressPatch) {
    if (!profile) return;
    setRowSaving(chapterKey(patch));
    try {
      await db.saveChapterProgress(patch);
      await Promise.all([
        db.getUserChapters().then(setChapters),
        db.getBacklogItems(profile.target_exam).then(setBacklogItems),
      ]);
      toast.success(`${label} saved`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setRowSaving(null);
    }
  }

  async function handleRemoveChapter(uc: UserChapter) {
    if (!confirm(`Remove "${uc.chapter}" (${uc.subject})? Progress and backlog will be deleted.`)) return;
    setRowSaving(chapterKey(uc));
    try {
      await db.deleteChapter(uc.subject, uc.chapter);
      setChapters((cs) => cs.filter((c) => chapterKey(c) !== chapterKey(uc)));
      setBacklogItems((bs) => bs.filter((b) => !(b.subject === uc.subject && b.chapter === uc.chapter)));
      toast.success("Chapter removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setRowSaving(null);
    }
  }

  async function handleChapterAction(
    uc: UserChapter,
    action: "complete" | "reset",
  ) {
    setRowSaving(chapterKey(uc));
    try {
      if (action === "complete") {
        await db.markChapterCompleted(uc.subject, uc.chapter);
      } else {
        await db.resetChapterProgress(uc.subject, uc.chapter);
      }
      setChapters(await db.getUserChapters());
      if (profile) setBacklogItems(await db.getBacklogItems(profile.target_exam));
      toast.success(action === "complete" ? "Chapter completed" : "Progress reset");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setRowSaving(null);
    }
  }

  // ---- New chapter form ----------------------------------------------------
  const [newSubject, setNewSubject] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const newCatalog = useMemo(
    () => (newSubject ? chaptersForSubject(newSubject, profile?.school_class ?? "12", profile?.stream ?? "other") : chapterCatalog),
    [newSubject, profile?.school_class, profile?.stream, chapterCatalog],
  );

  async function handleAddChapter() {
    if (!profile) return;
    const subject = newSubject.trim();
    const chapter = newChapter.trim();
    if (!subject || !chapter) {
      toast.error("Choose a subject and enter a chapter name.");
      return;
    }
    if (chapters.some((c) => c.subject === subject && c.chapter === chapter)) {
      toast.error("That chapter already exists.");
      return;
    }
    setRowSaving(`new|${subject}|${chapter}`);
    try {
      await db.saveChapterProgress({ exam: profile.target_exam ?? "other", subject, chapter, status: "not_started" });
      setChapters(await db.getUserChapters());
      setNewChapter("");
      toast.success("Chapter added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add chapter");
    } finally {
      setRowSaving(null);
    }
  }

  // ---- Backlog row save ----------------------------------------------------
  async function saveBacklogRow(item: BacklogItem) {
    setRowSaving(item.id);
    try {
      await db.updateBacklogItem(item.id, {
        priority: item.priority,
        difficulty: item.difficulty,
        pending_lectures: Math.max(0, Math.round(item.pending_lectures ?? 0)),
        pending_dpps: Math.max(0, Math.round(item.pending_dpps ?? 0)),
        pending_pyqs: Math.max(0, Math.round(item.pending_pyqs ?? 0)),
        revision_pending: Math.max(0, Math.round(item.revision_pending ?? 0)),
        pending_tests: Math.max(0, Math.round(item.pending_tests ?? 0)),
      } as Partial<BacklogItem>);
      setBacklogItems((bs) => bs.map((b) => (b.id === item.id ? item : b)));
      toast.success("Backlog updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update backlog");
    } finally {
      setRowSaving(null);
    }
  }

  const patchBacklogRow = (id: string, patch: Partial<BacklogItem>) =>
    setBacklogItems((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const planDays = WEEKDAYS.filter((d) => draft.days_off.includes(d.value));

  if (loadingRows && chapters.length === 0 && backlogItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your data…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-accent-400" /> Academic Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Edit every onboarding answer — changes flow instantly to the AI Planner, AI Mentor, Backlog and Dashboard.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search settings — e.g. 'coaching', 'sleep', 'mock tests', 'confidence'…"
          className="input-base pl-10"
        />
      </div>

      {/* ============ 1. Academic Information ============ */}
      <Section def={SECTIONS[0]} open={isSectionOpen(SECTIONS[0])} onToggle={() => toggleSection("academic")} search={search}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name">
            <input className="input-base" value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Class">
            <select className="select-base" value={draft.school_class} onChange={(e) => set("school_class", e.target.value)}>
              {SCHOOL_CLASSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Stream">
            <select className="select-base" value={draft.stream} onChange={(e) => set("stream", e.target.value)}>
              <option value="">Not set</option>
              {STREAMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="School board">
            <select className="select-base" value={draft.board} onChange={(e) => set("board", e.target.value)}>
              <option value="">Not set</option>
              {SCHOOL_BOARDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="School name">
            <input className="input-base" value={draft.school_name} onChange={(e) => set("school_name", e.target.value)} placeholder="e.g. Delhi Public School" />
          </Field>
          <Field label="Target exam(s)">
            <select className="select-base" value={draft.target_exam} onChange={(e) => set("target_exam", e.target.value)}>
              <option value="">Not set</option>
              {TARGET_EXAMS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Target year">
            <select className="select-base" value={draft.target_year} onChange={(e) => set("target_year", e.target.value)}>
              <option value="">Not set</option>
              {YEARS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            loading={saving === "Academic info"}
            onClick={() =>
              saveSection("Academic info", () => {
                const v = validateProfileSettings({ full_name: draft.full_name });
                if (!v.valid) { toast.error(v.errors[0]); return null; }
                return { full_name: draft.full_name, display_name: draft.full_name, school_class: draft.school_class, stream: draft.stream, board: draft.board, school_name: draft.school_name, target_exam: draft.target_exam || null, target_year: draft.target_year || null };
              })
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 2. School Schedule ============ */}
      <Section def={SECTIONS[1]} open={isSectionOpen(SECTIONS[1])} onToggle={() => toggleSection("school")} search={search}>
        <Field label="School days">
          <MultiChip options={WEEKDAYS} value={draft.school_days} onChange={(v) => set("school_days", v)} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="School start time">
            <input type="time" className="input-base" value={draft.school_start} onChange={(e) => set("school_start", normalizeTime(e.target.value))} />
          </Field>
          <Field label="School end time">
            <input type="time" className="input-base" value={draft.school_end} onChange={(e) => set("school_end", normalizeTime(e.target.value))} />
          </Field>
        </div>
        <Field label="School holidays" hint="Days school is closed — the planner treats them like weekends.">
          <MultiChip options={WEEKDAYS} value={draft.school_holidays} onChange={(v) => set("school_holidays", v)} />
        </Field>
        <div className="flex justify-end">
          <Button
            loading={saving === "School schedule"}
            onClick={() =>
              saveSection("School schedule", () => {
                const s = normalizeTime(draft.school_start), e = normalizeTime(draft.school_end);
                if (s && e && s >= e) { toast.error("School end time must be after the start time."); return null; }
                return { school_days: draft.school_days, school_start: s || null, school_end: e || null, school_holidays: draft.school_holidays, attends_school: draft.school_days.length > 0 };
              })
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 3. Coaching ============ */}
      <Section def={SECTIONS[2]} open={isSectionOpen(SECTIONS[2])} onToggle={() => toggleSection("coaching")} search={search}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Mode">
            <select className="select-base" value={draft.coaching_mode} onChange={(e) => set("coaching_mode", e.target.value)}>
              <option value="">Not set</option>
              {HOW_STUDY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Coaching name">
            <input
              className="input-base"
              list="coaching-names"
              value={draft.coaching_name}
              onChange={(e) => set("coaching_name", e.target.value)}
              placeholder="e.g. Allen, PW, Self study…"
            />
            <datalist id="coaching-names">
              {COACHING_NAME_OPTIONS.map((o) => <option key={o.value} value={o.label} />)}
            </datalist>
          </Field>
          <Field label="Class mode">
            <select className="select-base" value={draft.class_mode} onChange={(e) => set("class_mode", e.target.value)}>
              {CLASS_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Recorded lectures per day" hint="How many recorded lectures you watch per day.">
            <input type="number" min="0" max="8" className="input-base" value={draft.lectures_per_day}
              onChange={(e) => set("lectures_per_day", clampNumInRange(Number(e.target.value || 0), 0, 8))} />
          </Field>
          <Field label="Average lecture duration">
            <select className="select-base" value={String(draft.lecture_duration)}
              onChange={(e) => set("lecture_duration", Number(e.target.value))}>
              {LECTURE_DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        {draft.class_mode === "live" && (
          <div>
            <span className="input-label">Live class timings — toggle each day and set the time block</span>
            <div className="space-y-1.5">
              {WEEKDAYS.map((d) => {
                const entry = draft.class_schedule.find((e) => e.day === d.value);
                const on = !!entry;
                return (
                  <div key={d.value} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() =>
                        set("class_schedule", on
                          ? draft.class_schedule.filter((e) => e.day !== d.value)
                          : [...draft.class_schedule, { day: d.value, start: "08:00", end: "10:00" }])
                      }
                      className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0", on ? "bg-accent-600" : "bg-white/10")}
                    >
                      <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", on ? "left-[20px]" : "left-0.5")} />
                    </button>
                    <span className="text-sm text-slate-300 w-20 shrink-0">{d.label}</span>
                    {on && (
                      <div className="flex items-center gap-1.5">
                        <input type="time" className="input-base !py-1.5 !w-28" value={entry.start}
                          onChange={(e) => set("class_schedule", draft.class_schedule.map((x) => (x.day === d.value ? { ...x, start: normalizeTime(e.target.value) } : x)))} />
                        <span className="text-slate-500 text-xs">to</span>
                        <input type="time" className="input-base !py-1.5 !w-28" value={entry.end}
                          onChange={(e) => set("class_schedule", draft.class_schedule.map((x) => (x.day === d.value ? { ...x, end: normalizeTime(e.target.value) } : x)))} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            loading={saving === "Coaching"}
            onClick={() =>
              saveSection("Coaching", () => ({
                coaching_mode: draft.coaching_mode || null,
                coaching_name: draft.coaching_name || null,
                coaching_is_live: draft.class_mode === "live",
                class_mode: draft.class_mode,
                class_schedule: draft.class_schedule.filter((e) => normalizeTime(e.start) && normalizeTime(e.end)).map((e) => ({ ...e, start: normalizeTime(e.start), end: normalizeTime(e.end) })),
                lectures_per_day: draft.lectures_per_day,
                lecture_duration: draft.lecture_duration,
                lecture_duration_min: draft.lecture_duration,
                coaching_enabled: !!draft.coaching_mode && draft.coaching_mode !== "self_study",
              }))
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 4. Study Preferences ============ */}
      <Section def={SECTIONS[3]} open={isSectionOpen(SECTIONS[3])} onToggle={() => toggleSection("study")} search={search}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Daily study hours" hint="Base goal — the planner calibrates per weekday/weekend.">
            <input type="number" min="1" max="16" className="input-base" value={draft.daily_goal_hours}
              onChange={(e) => set("daily_goal_hours", clampNumInRange(Number(e.target.value || 0), 1, 16))} />
          </Field>
          <Field label="Productive time" hint="Planner schedules your hardest tasks in this window.">
            <select className="select-base" value={draft.productive_time} onChange={(e) => set("productive_time", e.target.value)}>
              <option value="">Not set</option>
              {PRODUCTIVE_SLOTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Night Owl mode" hint="Shifts your productive window to late night (after 10 PM).">
            <div className="pt-2">
              <MultiChip
                options={[{ value: "on", label: "Enabled" }, { value: "off", label: "Disabled" }]}
                value={draft.night_owl_mode ? ["on"] : ["off"]}
                onChange={(v) => set("night_owl_mode", v.includes("on"))}
              />
            </div>
          </Field>
          <Field label="Sleep time">
            <input type="time" className="input-base" value={draft.sleep_time} onChange={(e) => set("sleep_time", normalizeTime(e.target.value))} />
          </Field>
          <Field label="Wake-up time">
            <input type="time" className="input-base" value={draft.wake_up_time} onChange={(e) => set("wake_up_time", normalizeTime(e.target.value))} />
          </Field>
          <Field label="Preferred break duration">
            <select className="select-base" value={String(draft.break_min)} onChange={(e) => set("break_min", Number(e.target.value))}>
              {BREAK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Preferred study session length">
            <select className="select-base" value={String(draft.session_length_min)} onChange={(e) => set("session_length_min", Number(e.target.value))}>
              {SESSION_LENGTHS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Preferred revision time" hint="When revision blocks are scheduled each day.">
            <input type="time" className="input-base" value={draft.revision_time} onChange={(e) => set("revision_time", normalizeTime(e.target.value))} />
          </Field>
          <Field label="Sleep goal (hours per night)">
            <select className="select-base" value={String(draft.desired_sleep_hours ?? "")}
              onChange={(e) => set("desired_sleep_hours", Number(e.target.value))}>
              <option value="">Not set</option>
              {SLEEP_GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            loading={saving === "Study preferences"}
            onClick={() =>
              saveSection("Study preferences", () => {
                const v = validateProfileSettings({
                  daily_goal_hours: draft.daily_goal_hours,
                  desired_sleep_hours: draft.desired_sleep_hours ?? undefined,
                  session_length_min: draft.session_length_min,
                  break_min: draft.break_min,
                });
                if (!v.valid) { toast.error(v.errors[0]); return null; }
                return {
                  daily_goal_hours: draft.daily_goal_hours,
                  productive_time: draft.night_owl_mode ? "night_owl" : (draft.productive_time || null),
                  night_owl_mode: draft.night_owl_mode,
                  sleep_time: normalizeTime(draft.sleep_time) || null,
                  wake_up_time: normalizeTime(draft.wake_up_time) || null,
                  break_min: draft.break_min,
                  session_length_min: draft.session_length_min,
                  revision_time: normalizeTime(draft.revision_time) || null,
                  desired_sleep_hours: draft.desired_sleep_hours ?? null,
                };
              })
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 5. Subjects & Chapters ============ */}
      <Section def={SECTIONS[4]} open={isSectionOpen(SECTIONS[4])} onToggle={() => toggleSection("chapters")} search={search}>
        {/* Add chapter */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5 text-accent-400" /> Add a chapter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className="select-base" value={newSubject} onChange={(e) => { setNewSubject(e.target.value); setNewChapter(""); }}>
              <option value="">Select subject…</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="relative">
              <input
                className="input-base"
                list="chapter-suggestions"
                placeholder="Chapter name (or pick a suggestion)"
                value={newChapter}
                onChange={(e) => setNewChapter(e.target.value)}
              />
              <datalist id="chapter-suggestions">
                {newCatalog.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddChapter} loading={rowSaving?.startsWith("new|")}>
              <Plus className="w-4 h-4" /> Add chapter
            </Button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No chapters yet — add your first chapter above.
          </p>
        ) : (
          <div className="space-y-2.5">
            {chapters.map((uc) => (
              <ChapterRow
                key={chapterKey(uc)}
                uc={uc}
                saving={rowSaving === chapterKey(uc)}
                onSave={applyChapterAction}
                onComplete={() => handleChapterAction(uc, "complete")}
                onReset={() => handleChapterAction(uc, "reset")}
                onRemove={() => handleRemoveChapter(uc)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ============ 6. Backlog Preferences ============ */}
      <Section def={SECTIONS[5]} open={isSectionOpen(SECTIONS[5])} onToggle={() => toggleSection("backlog")} search={search}>
        {backlogItems.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No backlog items yet — add them in the Backlog module.
          </p>
        ) : (
          <div className="space-y-2.5">
            {backlogItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-500">{item.subject}{item.chapter ? ` — ${item.chapter}` : ""}</p>
                  </div>
                  <span className={cn("text-[10px] rounded-full px-2 py-0.5 shrink-0", item.status === "done" ? "bg-success-600/15 text-success-400" : "bg-warning-600/15 text-warning-400")}>
                    {item.status === "done" ? "Done" : "Todo"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Priority">
                    <select className="select-base" value={item.priority}
                      onChange={(e) => patchBacklogRow(item.id, { priority: e.target.value as Priority })}>
                      {(["low", "medium", "high", "critical"] as Priority[]).map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Difficulty">
                    <select className="select-base" value={item.difficulty ?? ""}
                      onChange={(e) => patchBacklogRow(item.id, { difficulty: (e.target.value || null) as BacklogDifficulty | null })}>
                      <option value="">Not set</option>
                      {(["easy", "medium", "hard"] as BacklogDifficulty[]).map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Pending lectures">
                    <input type="number" min="0" className="input-base" value={item.pending_lectures ?? 0}
                      onChange={(e) => patchBacklogRow(item.id, { pending_lectures: Math.max(0, Math.round(Number(e.target.value || 0))) })} />
                  </Field>
                  <Field label="Pending questions">
                    <input type="number" min="0" className="input-base" value={item.pending_dpps ?? 0}
                      onChange={(e) => patchBacklogRow(item.id, { pending_dpps: Math.max(0, Math.round(Number(e.target.value || 0))) })} />
                  </Field>
                  <Field label="Pending revision">
                    <input type="number" min="0" className="input-base" value={item.revision_pending ?? 0}
                      onChange={(e) => patchBacklogRow(item.id, { revision_pending: Math.max(0, Math.round(Number(e.target.value || 0))) })} />
                  </Field>
                  <Field label="Pending tests">
                    <input type="number" min="0" className="input-base" value={item.pending_tests ?? 0}
                      onChange={(e) => patchBacklogRow(item.id, { pending_tests: Math.max(0, Math.round(Number(e.target.value || 0))) })} />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" loading={rowSaving === item.id} onClick={() => saveBacklogRow(item)}>
                    <Save className="w-3.5 h-3.5" /> Save item
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ============ 7. AI Planner Preferences ============ */}
      <Section def={SECTIONS[6]} open={isSectionOpen(SECTIONS[6])} onToggle={() => toggleSection("planner")} search={search}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Planner style">
            <select className="select-base" value={draft.planner_style} onChange={(e) => set("planner_style", e.target.value)}>
              {PLANNER_STYLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Maximum daily study hours" hint="The planner never schedules more than this.">
            <input type="number" min="1" max="16" className="input-base" value={draft.max_daily_study_hours ?? ""}
              onChange={(e) => set("max_daily_study_hours", e.target.value === "" ? null : clampNumInRange(Number(e.target.value), 1, 16))} />
          </Field>
          <Field label="Minimum daily study hours" hint="The planner always schedules at least this.">
            <input type="number" min="0" max="16" className="input-base" value={draft.min_daily_study_hours ?? ""}
              onChange={(e) => set("min_daily_study_hours", e.target.value === "" ? null : clampNumInRange(Number(e.target.value), 0, 16))} />
          </Field>
          <Field label="Daily revision time">
            <input type="time" className="input-base" value={draft.revision_time} onChange={(e) => set("revision_time", normalizeTime(e.target.value))} />
          </Field>
          <Field label="Practice vs revision ratio" hint={`${draft.practice_revision_ratio}% practice · ${100 - draft.practice_revision_ratio}% revision`}>
            <input
              type="range" min="0" max="100" step="5" value={draft.practice_revision_ratio}
              onChange={(e) => set("practice_revision_ratio", Number(e.target.value))}
              className="w-full accent-accent-600"
            />
          </Field>
          <Field label="Weekly rest day" hint="Light-day plans are scheduled on these days.">
            <MultiChip options={WEEKDAYS} value={draft.days_off} onChange={(v) => set("days_off", v)} />
          </Field>
        </div>
        <div>
          <span className="input-label">Task priority weights — how the planner splits your day</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([["backlog", "Backlog"], ["lecture", "Lectures"], ["practice", "Practice"], ["mock", "Mock tests"]] as const).map(([key, label]) => (
              <Field key={key} label={label}>
                <input type="number" min="0" max="100" className="input-base" value={draft.priority_weights[key]}
                  onChange={(e) => set("priority_weights", { ...draft.priority_weights, [key]: clampNumInRange(Number(e.target.value || 0), 0, 100) })} />
              </Field>
            ))}
          </div>
          <p className={cn("text-[11px] mt-1.5", weightSum === 100 ? "text-success-400" : "text-warning-400")}>
            Total: {weightSum}% {weightSum === 100 ? "— balanced ✓" : "— must add up to 100%"}
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            loading={saving === "Planner preferences"}
            onClick={() =>
              saveSection("Planner preferences", () => {
                const v = validateProfileSettings({
                  max_daily_study_hours: draft.max_daily_study_hours,
                  min_daily_study_hours: draft.min_daily_study_hours,
                  practice_revision_ratio: draft.practice_revision_ratio,
                  priority_weights: draft.priority_weights,
                });
                if (!v.valid) { toast.error(v.errors[0]); return null; }
                return {
                  ai_planning_style: draft.planner_style,
                  max_daily_study_hours: draft.max_daily_study_hours,
                  min_daily_study_hours: draft.min_daily_study_hours,
                  practice_revision_ratio: draft.practice_revision_ratio,
                  priority_weights: draft.priority_weights,
                  revision_time: normalizeTime(draft.revision_time) || null,
                  days_off: draft.days_off,
                  study_days: WEEKDAYS.filter((d) => !draft.days_off.includes(d.value)).map((d) => d.value),
                };
              })
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 8. Mock Test Preferences ============ */}
      <Section def={SECTIONS[7]} open={isSectionOpen(SECTIONS[7])} onToggle={() => toggleSection("mocks")} search={search}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tests per week">
            <select className="select-base" value={String(draft.tests_per_week)} onChange={(e) => set("tests_per_week", Number(e.target.value))}>
              {TESTS_PER_WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Test duration">
            <select className="select-base" value={String(draft.test_duration_min)} onChange={(e) => set("test_duration_min", Number(e.target.value))}>
              {MOCK_DURATIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Preferred test day">
            <select className="select-base" value={draft.preferred_test_day} onChange={(e) => set("preferred_test_day", e.target.value)}>
              <option value="">Any day</option>
              {WEEKDAYS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <span className="input-label">Mock analysis settings</span>
          <div className="space-y-2">
            {[
              ["auto_review", "Auto-review after each test", "Schedule a review block right after the mock"],
              ["show_weak_chapters", "Surface weak chapters", "Highlight weak chapters from the analysis in the planner"],
            ].map(([key, label, hint]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-300">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
                </div>
                <button
                  type="button" role="switch" aria-checked={!!draft.mock_analysis_prefs[key]}
                  onClick={() => set("mock_analysis_prefs", { ...draft.mock_analysis_prefs, [key]: !draft.mock_analysis_prefs[key] })}
                  className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0", draft.mock_analysis_prefs[key] ? "bg-accent-600" : "bg-white/10")}
                >
                  <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", draft.mock_analysis_prefs[key] ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            loading={saving === "Mock test preferences"}
            onClick={() =>
              saveSection("Mock test preferences", () => {
                const v = validateProfileSettings({ tests_per_week: draft.tests_per_week, test_duration_min: draft.test_duration_min });
                if (!v.valid) { toast.error(v.errors[0]); return null; }
                return {
                  tests_per_week: draft.tests_per_week,
                  test_duration_min: draft.test_duration_min,
                  preferred_test_day: draft.preferred_test_day || null,
                  mock_analysis_prefs: draft.mock_analysis_prefs,
                };
              })
            }
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 9. Notifications ============ */}
      <Section def={SECTIONS[8]} open={isSectionOpen(SECTIONS[8])} onToggle={() => toggleSection("notifications")} search={search}>
        <div className="space-y-2">
          {NOTIFICATION_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-300">{f.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
              </div>
              <button
                type="button" role="switch" aria-checked={!!draft.notification_prefs[f.key]}
                onClick={() => set("notification_prefs", { ...draft.notification_prefs, [f.key]: !draft.notification_prefs[f.key] })}
                className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0", draft.notification_prefs[f.key] ? "bg-accent-600" : "bg-white/10")}
              >
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", draft.notification_prefs[f.key] ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button loading={saving === "Notifications"} onClick={() => saveSection("Notifications", () => ({ notification_prefs: draft.notification_prefs }))}>
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      {/* ============ 10. Personalization ============ */}
      <Section def={SECTIONS[9]} open={isSectionOpen(SECTIONS[9])} onToggle={() => toggleSection("personal")} search={search}>
        <div>
          <span className="input-label">Theme</span>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = theme === opt.value;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value} type="button" onClick={() => setTheme(opt.value)}
                  className={cn("rounded-xl px-3 py-3 text-left transition-all border", active ? "border-accent-500 bg-accent-600/10" : "border-white/10 bg-white/5 hover:border-white/20")}
                >
                  <Icon className={cn("w-5 h-5 mb-2", active ? "text-accent-400" : "text-slate-400")} />
                  <div className="text-sm font-medium text-white">{opt.label}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className="input-label">Accent color — applies instantly across the whole app</span>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.value} type="button" onClick={() => setAccent(a.value)}
                title={a.label}
                className={cn("w-9 h-9 rounded-full transition-transform border-2", accent === a.value ? "border-white scale-110" : "border-transparent hover:scale-105")}
                style={{ backgroundColor: a.swatch }}
                aria-label={`${a.label} accent`}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Language">
            <select className="select-base" value={draft.preferred_language} onChange={(e) => set("preferred_language", e.target.value)}>
              {PREFERRED_LANGUAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Time format">
            <select className="select-base" value={draft.time_format} onChange={(e) => set("time_format", e.target.value)}>
              {TIME_FORMATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Date format">
            <select className="select-base" value={draft.date_format} onChange={(e) => set("date_format", e.target.value)}>
              {DATE_FORMATS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            loading={saving === "Personalization"}
            onClick={() => saveSection("Personalization", () => ({ preferred_language: draft.preferred_language, time_format: draft.time_format, date_format: draft.date_format }))}
          >
            <Save className="w-4 h-4" /> Save changes
          </Button>
        </div>
      </Section>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-600 pt-2 pb-6">
        <ArrowLeft className="w-3 h-3" />
        Changes save instantly to your account — the AI Planner, AI Mentor, Backlog and Dashboard pick them up automatically.
        {planDays.length > 0 && <> · Rest day: {planDays.map((d) => WEEKDAY_LABELS[d.value]).join(", ")}</>}
      </div>
    </div>
  );
}

// ============================================================================
// Chapter row — inline editor for one chapter's progress
// ============================================================================

function ChapterRow({
  uc, saving, onSave, onComplete, onReset, onRemove,
}: {
  uc: UserChapter;
  saving: boolean;
  onSave: (label: string, patch: ChapterProgressPatch, optimistic: (ucs: UserChapter[], bls: BacklogItem[]) => void) => Promise<void>;
  onComplete: () => Promise<void>;
  onReset: () => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [status, setStatus] = useState<ChapterStatus>(uc.status ?? "not_started");
  const [lectures, setLectures] = useState(uc.lectures_remaining ?? 0);
  const [modulePct, setModulePct] = useState(Number((uc.progress?.module_pct ?? 0)));
  const [dpp, setDpp] = useState(Number((uc.progress?.dpp_pending ?? 0)));
  const [pyq, setPyq] = useState(Number((uc.progress?.pyq_pending ?? 0)));
  const [revision, setRevision] = useState(uc.revision_pending ?? 0);
  const [revisionLevel, setRevisionLevel] = useState(Number((uc.progress?.revision_level ?? 0)));
  const [confidence, setConfidence] = useState(uc.confidence ?? 3);
  const [tests, setTests] = useState(Number((uc.progress?.pending_tests ?? 0)));

  // Reset the inline editor when the row's data changes (optimistic saves).
  // Render-phase adjustment — the editor picks up the new values in the same
  // commit that delivered them; the initial values come from useState
  // initializers on mount.
  const [prevUc, setPrevUc] = useState(uc);
  if (prevUc !== uc) {
    setPrevUc(uc);
    setStatus(uc.status ?? "not_started");
    setLectures(uc.lectures_remaining ?? 0);
    setModulePct(Number(uc.progress?.module_pct ?? 0));
    setDpp(Number(uc.progress?.dpp_pending ?? 0));
    setPyq(Number(uc.progress?.pyq_pending ?? 0));
    setRevision(uc.revision_pending ?? 0);
    setRevisionLevel(Number(uc.progress?.revision_level ?? 0));
    setConfidence(uc.confidence ?? 3);
    setTests(Number(uc.progress?.pending_tests ?? 0));
  }

  const done = status === "completed";
  const progressPct = useMemo(() => {
    const lectureDone = status === "completed" ? 1 : status === "in_progress" || status === "started" ? 0.5 : 0;
    const m = Math.min(100, Math.max(0, modulePct));
    const d = dpp > 0 ? 0 : 1;
    const p = pyq > 0 ? 0 : 1;
    const r = revision > 0 ? 0 : 1;
    const w = { lectures: 0.35, module: 0.25, dpp: 0.15, pyq: 0.15, revision: 0.1 };
    return Math.round(((lectureDone * w.lectures) + (m / 100) * w.module + d * w.dpp + p * w.pyq + r * w.revision) * 100);
  }, [status, modulePct, dpp, pyq, revision]);

  const num = (v: string | number, min: number, max: number) => clampNumInRange(Number(v || 0), min, max);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{uc.chapter}</p>
          <p className="text-[11px] text-slate-500">{uc.subject}</p>
        </div>
        <span className={cn("text-[10px] rounded-full px-2 py-0.5 shrink-0", done ? "bg-success-600/15 text-success-400" : "bg-accent-600/15 text-accent-400")}>
          {progressPct}% done
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Lecture status">
          <select className="select-base" value={status} onChange={(e) => setStatus(e.target.value as ChapterStatus)}>
            {(["not_started", "started", "in_progress", "completed"] as ChapterStatus[]).map((s) => (
              <option key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Lectures remaining">
          <input type="number" min="0" max="99" className="input-base" value={lectures} onChange={(e) => setLectures(num(e.target.value, 0, 99))} />
        </Field>
        <Field label="Module progress %">
          <input type="number" min="0" max="100" className="input-base" value={modulePct} onChange={(e) => setModulePct(num(e.target.value, 0, 100))} />
        </Field>
        <Field label="DPP pending">
          <input type="number" min="0" max="99" className="input-base" value={dpp} onChange={(e) => setDpp(num(e.target.value, 0, 99))} />
        </Field>
        <Field label="PYQ pending">
          <input type="number" min="0" max="99" className="input-base" value={pyq} onChange={(e) => setPyq(num(e.target.value, 0, 99))} />
        </Field>
        <Field label="Revision pending">
          <input type="number" min="0" max="99" className="input-base" value={revision} onChange={(e) => setRevision(num(e.target.value, 0, 99))} />
        </Field>
        <Field label="Revision rounds" hint="0–3 rounds needed">
          <select className="select-base" value={revisionLevel} onChange={(e) => setRevisionLevel(Number(e.target.value))}>
            {[0, 1, 2, 3].map((r) => <option key={r} value={r}>{r === 0 ? "None" : `${r} round${r > 1 ? "s" : ""}`}</option>)}
          </select>
        </Field>
        <Field label="Confidence" hint="1 weak – 5 strong">
          <select className="select-base" value={confidence} onChange={(e) => setConfidence(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>{c} — {c <= 2 ? "Weak" : c === 3 ? "Okay" : c === 4 ? "Good" : "Strong"}</option>)}
          </select>
        </Field>
        <Field label="Pending tests">
          <input type="number" min="0" max="99" className="input-base" value={tests} onChange={(e) => setTests(num(e.target.value, 0, 99))} />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" onClick={onComplete} title="Mark chapter completed" disabled={saving}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset} title="Reset progress" disabled={saving}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} title="Remove chapter" disabled={saving}>
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </Button>
        </div>
        <Button
          size="sm" loading={saving}
          onClick={() =>
            onSave(`${uc.chapter}`, {
              exam: uc.exam ?? "other",
              subject: uc.subject,
              chapter: uc.chapter,
              status,
              lectures_remaining: lectures,
              module_pct: modulePct,
              dpp_pending: dpp,
              pyq_pending: pyq,
              revision_pending: revision,
              revision_level: revisionLevel,
              confidence,
              pending_tests: tests,
            }, () => undefined)
          }
        >
          <Save className="w-3.5 h-3.5" /> Save chapter
        </Button>
      </div>
    </div>
  );
}
