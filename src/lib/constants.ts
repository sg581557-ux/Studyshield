import type { ChapterStatus, EnergyLevel, StudyMode, Priority, ModuleProgress, BacklogKind, Achievement } from "./types";

export const STORAGE_KEY = "studyshield:app:data";
export const APP_VERSION = 1;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_focus",
    title: "First Focus",
    description: "Complete your first focus session.",
    icon: "🎯",
    metric: "focus",
    threshold: 1,
    unlockedAt: null,
  },
  {
    id: "task_master",
    title: "Task Master",
    description: "Complete 10 tasks.",
    icon: "✅",
    metric: "tasks",
    threshold: 10,
    unlockedAt: null,
  },
  {
    id: "formula_keeper",
    title: "Formula Keeper",
    description: "Bookmark 5 formulas.",
    icon: "🧠",
    metric: "formulas",
    threshold: 5,
    unlockedAt: null,
  },
];

export const SUBJECT_COLORS: Record<string, string> = {
  Physics: "#38bdf8",
  Chemistry: "#f59e0b",
  Mathematics: "#8b5cf6",
  Biology: "#10b981",
  Botany: "#10b981",
  Zoology: "#059669",
  Accounts: "#ef4444",
  Accounting: "#ef4444",
  Accountancy: "#ef4444",
  Economics: "#14b8a6",
  Business: "#6366f1",
  "Business Studies": "#6366f1",
  "Business Laws": "#6366f1",
  "Business Economics": "#14b8a6",
  General: "#64748b",
  // UPSC / State PSC
  History: "#f97316",
  Geography: "#0ea5e9",
  Polity: "#8b5cf6",
  "Science & Technology": "#06b6d4",
  Environment: "#22c55e",
  "Current Affairs": "#eab308",
  Ethics: "#a78bfa",
  // Aptitude / Reasoning / English
  "Quantitative Aptitude": "#8b5cf6",
  "Quantitative Techniques": "#8b5cf6",
  "General Intelligence & Reasoning": "#f43f5e",
  "Reasoning Ability": "#f43f5e",
  Reasoning: "#f43f5e",
  "Logical Reasoning": "#f43f5e",
  "Logical Reasoning & Data Interpretation": "#f43f5e",
  "English Language": "#38bdf8",
  English: "#38bdf8",
  "General Awareness": "#eab308",
  "General Studies": "#64748b",
  "General Ability Test": "#64748b",
  "General Knowledge": "#eab308",
  "Current Affairs & General Knowledge": "#eab308",
  "Verbal Ability & Reading Comprehension": "#38bdf8",
  "Verbal Ability": "#38bdf8",
  "Verbal Reasoning": "#38bdf8",
  "Quantitative Reasoning": "#8b5cf6",
  "Data Interpretation": "#f43f5e",
  "Data Insights": "#f43f5e",
  "Analytical Writing": "#38bdf8",
  // CA / Commerce
  "Advanced Accounting": "#ef4444",
  "Corporate Laws": "#6366f1",
  "Cost & Management Accounting": "#f59e0b",
  Taxation: "#f97316",
  "Financial Reporting": "#ef4444",
  "Strategic Financial Management": "#0ea5e9",
  "Advanced Auditing": "#a78bfa",
  "Direct Tax Laws": "#f97316",
  // NDA / Defence
  "General Science": "#10b981",
  // GATE / Engineering
  "Engineering Mathematics": "#8b5cf6",
  "General Aptitude": "#eab308",
  "Core Technical": "#06b6d4",
  "Core Subjects": "#06b6d4",
  "Core Discipline — Part I": "#06b6d4",
  // CUET / School
  Science: "#10b981",
  "Social Science": "#f97316",
  "Social Studies": "#f97316",
  "History & Civics": "#f97316",
  "Political Science": "#8b5cf6",
  Psychology: "#ec4899",
  Sociology: "#a78bfa",
  "Applied Science": "#06b6d4",
  "Engineering Mechanics": "#0ea5e9",
  "Computer Fundamentals": "#22d3ee",
  "Computer Awareness": "#22d3ee",
  "Banking Awareness": "#0ea5e9",
  "Computer Science": "#22d3ee",
  // Law
  "Legal Reasoning": "#6366f1",
  // Generic fallbacks
  Mathematics_alt: "#8b5cf6",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  coaching: "Coaching", lecture: "Lecture", backlog: "Backlog", revision: "Revision",
  dpp: "DPP", module: "Module", pyq: "PYQ", formula_revision: "Formula Revision",
  spaced_revision: "Spaced Revision", school: "School", study: "Study Session",
  mock_test_review: "Mock Test Review", practice: "Practice Questions",
  break: "Rest Break", mistake_analysis: "Mistake Analysis", notes: "Revise Notes",
};

export const TASK_TYPE_DURATIONS_MIN: Record<string, number> = {
  coaching: 120, lecture: 120, backlog: 45, revision: 25, dpp: 30,
  module: 45, pyq: 45, formula_revision: 20, spaced_revision: 25, school: 360, study: 45,
  mock_test_review: 30, practice: 45,
};

export const PRIORITY_ORDER: Record<Priority, number> = { critical: -1, high: 0, medium: 1, low: 2 };

export const CHAPTER_STATUS_LABELS: Record<ChapterStatus, string> = {
  not_started: "Not Started", started: "Started", in_progress: "In Progress",
  completed: "Completed", backlog: "Backlog", revision_pending: "Revision Pending",
  revision_completed: "Revision Done", dpp_pending: "DPP Pending",
  module_pending: "Module Pending", pyq_pending: "PYQ Pending", mastered: "Mastered",
};

export const CHAPTER_STATUS_OPTIONS: ChapterStatus[] = [
  "not_started", "started", "in_progress", "completed", "backlog",
  "revision_pending", "revision_completed", "dpp_pending", "module_pending", "pyq_pending", "mastered",
];

export const CHAPTER_STATUS_COLORS: Record<ChapterStatus, string> = {
  not_started: "border-slate-600 text-slate-400",
  started: "border-accent-500 text-accent-400",
  in_progress: "border-accent-500 text-accent-400",
  completed: "border-success-500 text-success-400",
  backlog: "border-danger-500 text-danger-400",
  revision_pending: "border-warning-500 text-warning-400",
  revision_completed: "border-success-500 text-success-400",
  dpp_pending: "border-warning-500 text-warning-400",
  module_pending: "border-warning-500 text-warning-400",
  pyq_pending: "border-warning-500 text-warning-400",
  mastered: "border-accent-500 text-accent-400",
};

export const ENERGY_LEVELS: { value: EnergyLevel; label: string }[] = [
  { value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" },
];

export const STUDY_MODES: { value: StudyMode; label: string; desc: string }[] = [
  { value: "balanced", label: "Balanced", desc: "Even mix of learning + revision" },
  { value: "hard_push", label: "Hard Push", desc: "More lectures, less revision" },
  { value: "recovery", label: "Recovery", desc: "Lighter day, mostly revision" },
  { value: "exam_sprint", label: "Exam Sprint", desc: "PYQs and mock-heavy" },
];

export const FORMULA_DIFFICULTIES: string[] = ["easy", "medium", "hard"];

export const XP_PER_TASK = 50;
export const XP_PER_FOCUS_MIN = 2;

export const FOCUS_MODES: { id: string; label: string; work: number; shortBreak: number; longBreak: number; cycles: number }[] = [
  { id: "pomodoro", label: "Pomodoro", work: 25, shortBreak: 5, longBreak: 15, cycles: 4 },
  { id: "deep", label: "Deep Work", work: 50, shortBreak: 10, longBreak: 20, cycles: 3 },
  { id: "sprint", label: "Sprint", work: 15, shortBreak: 3, longBreak: 10, cycles: 6 },
];

export const BACKLOG_KINDS: { value: BacklogKind; label: string; desc: string }[] = [
  { value: "lecture", label: "Lecture", desc: "Pending lectures to watch/attend" },
  { value: "dpp", label: "DPP", desc: "Daily Practice Problems sheets pending" },
  { value: "module", label: "Module", desc: "Module question practice" },
];

export const MODULE_PROGRESS_OPTIONS: { value: ModuleProgress; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "started", label: "Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function levelFromXP(xp: number): { level: number; title: string; current: number; needed: number; pct: number } {
  const level = Math.floor(xp / 800) + 1;
  const current = xp % 800;
  return { level, title: `Level ${level}`, current, needed: 800, pct: Math.round((current / 800) * 100) };
}

export const uid = (prefix = "id"): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
export const todayISODate = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function minutesToHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const XP_PER_LEVEL = 800;
