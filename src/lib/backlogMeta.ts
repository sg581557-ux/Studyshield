import type { BacklogItem, BacklogKind, BacklogDifficulty, BacklogResourceProgress, Priority } from "./types";
import { SUBJECT_COLORS } from "./constants";
import { EXAM_DATA, getExamByName, getChaptersForSubject, getSubjectsForExam } from "./examData";

// ===========================================================================
// Resource metadata (labels, units, defaults, colors, time estimates)
// ===========================================================================

export interface BacklogResourceMeta {
  kind: BacklogKind;
  label: string;
  unit: string;
  /** Estimated minutes to finish ONE unit of this resource. */
  perUnitMin: number;
  /** Sensible default "total" used when the user just taps a quick-add chip. */
  defaultTotal: number;
  color: string;
}

export const BACKLOG_RESOURCES: BacklogResourceMeta[] = [
  { kind: "lecture", label: "Lecture", unit: "lectures", perUnitMin: 75, defaultTotal: 1, color: "#38bdf8" },
  { kind: "module", label: "Module", unit: "exercises", perUnitMin: 40, defaultTotal: 4, color: "#a78bfa" },
  { kind: "dpp", label: "DPP", unit: "questions", perUnitMin: 1.5, defaultTotal: 30, color: "#fb7185" },
  { kind: "pyq", label: "PYQ", unit: "questions", perUnitMin: 1.5, defaultTotal: 20, color: "#34d399" },
  { kind: "notes", label: "Notes", unit: "sets", perUnitMin: 25, defaultTotal: 1, color: "#fbbf24" },
  { kind: "revision", label: "Revision", unit: "rounds", perUnitMin: 30, defaultTotal: 2, color: "#22d3ee" },
  { kind: "assignment", label: "Assignment", unit: "assignments", perUnitMin: 20, defaultTotal: 1, color: "#f97316" },
  { kind: "mock_test", label: "Mock Test", unit: "tests", perUnitMin: 180, defaultTotal: 1, color: "#f43f5e" },
  { kind: "custom", label: "Custom", unit: "items", perUnitMin: 30, defaultTotal: 1, color: "#94a3b8" },
];

export const resourceMeta = (kind: BacklogKind): BacklogResourceMeta =>
  BACKLOG_RESOURCES.find((r) => r.kind === kind) ?? BACKLOG_RESOURCES[BACKLOG_RESOURCES.length - 1];

export const RESOURCE_LABEL: Record<BacklogKind, string> = Object.fromEntries(
  BACKLOG_RESOURCES.map((r) => [r.kind, r.label]),
) as Record<BacklogKind, string>;

// ===========================================================================
// Exams / subjects / chapters
// ===========================================================================

// ---------------------------------------------------------------------------
// Exam resolution — single source of truth is EXAM_DATA
// ---------------------------------------------------------------------------

/** All available exams — derived from EXAM_DATA to keep Backlog in sync with syllabus. */
export const BACKLOG_EXAMS: { id: string; label: string }[] = EXAM_DATA.map((e) => ({
  id: e.id,
  label: e.name,
}));

/** Human-readable label for any stored exam id (including legacy aliases). */
export const EXAM_LABEL: Record<string, string> = {
  ...Object.fromEntries(EXAM_DATA.map((e) => [e.id, e.name] as const)),
  // legacy aliases kept for backward-compat data
  jee: "JEE Main",
  neet: "NEET UG",
  boards: "CBSE Board Exams",
  "cbse-12": "CBSE Board Exams",
  "cbse-11": "CBSE Board Exams",
  "cbse-10": "CBSE Board Exams",
  icse: "ICSE Board Exams",
  isc: "ISC Board Exams",
  "state-boards": "State Board Exams",
};

/** Normalizes any user-facing exam string (label, id, legacy alias) to an EXAM_DATA entry. */
function resolveExam(input: string): (typeof EXAM_DATA)[number] | undefined {
  const n = input.trim().toLowerCase();
  if (!n) return undefined;
  // direct id match
  let hit = EXAM_DATA.find((e) => e.id.toLowerCase() === n);
  if (hit) return hit;
  // direct name match (case-insensitive)
  hit = EXAM_DATA.find((e) => e.name.toLowerCase() === n);
  if (hit) return hit;
  const alias: Record<string, string> = {
    jee: "jee-main",
    "jee main": "jee-main",
    "jee-main+jee-advanced": "jee-main",
    "jee advanced": "jee-advanced",
    neet: "neet-ug",
    "neet ug": "neet-ug",
    boards: "cbse-board",
    board: "cbse-board",
    cbse: "cbse-board",
    "cbse board": "cbse-board",
    "cbse board exams": "cbse-board",
    "cbse-12": "cbse-board",
    "cbse-11": "cbse-board",
    "cbse-10": "cbse-board",
    icse: "icse-board",
    "icse board": "icse-board",
    "icse board exams": "icse-board",
    isc: "isc-board",
    "isc board": "isc-board",
    "state boards": "state-board",
    "state board": "state-board",
    "state board exams": "state-board",
    upsc: "upsc-cse",
    "upsc cse": "upsc-cse",
    ssc: "ssc-cgl",
    "ssc cgl": "ssc-cgl",
    "ssc chsl": "ssc-chsl",
    banking: "banking-exams",
    "banking exams": "banking-exams",
    cuet: "cuet-ug",
    "cuet ug": "cuet-ug",
    "cuet pg": "cuet-pg",
    "mht cet": "mht-cet",
    railway: "railway-exams",
    "railway exams": "railway-exams",
    "state psc": "state-psc",
    "other (custom)": "other-custom",
    school: "school-general",
    "school exams (general)": "school-general",
    olympiad: "olympiads",
  };
  const aliasedId = alias[n];
  if (aliasedId) {
    hit = EXAM_DATA.find((e) => e.id === aliasedId);
    if (hit) return hit;
  }
  return undefined;
}

/** Legacy map for exams that had a custom display name before EXAM_DATA sync. */
const EXAM_SOURCE: Record<string, string> = {
  "jee-main": "JEE Main",
  "jee-advanced": "JEE Advanced",
  neet: "NEET UG",
  "neet-ug": "NEET UG",
  boards: "CBSE Board Exams",
  "cbse-board": "CBSE Board Exams",
  "icse-board": "ICSE Board Exams",
  "isc-board": "ISC Board Exams",
  "state-board": "State Board Exams",
};

export function subjectsForExam(exam: string): string[] {
  const trimmed = (exam ?? "").trim();
  if (!trimmed) {
    const other = EXAM_DATA.find((e) => e.id === "other");
    return other ? other.subjects.map((s) => s.name) : ["General Studies"];
  }
  const resolved = resolveExam(trimmed);
  if (resolved) return resolved.subjects.map((s) => s.name);
  // fallback: try name-based lookup (covers TARGET_EXAMS labels like "UPSC CSE")
  const byName = getSubjectsForExam(trimmed);
  if (byName.length) return byName.map((s) => s.name);
  // case-insensitive name fallback
  const ci = EXAM_DATA.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  if (ci) return ci.subjects.map((s) => s.name);
  // try alias map via EXAM_SOURCE
  const source = EXAM_SOURCE[trimmed] ?? EXAM_SOURCE[trimmed.toLowerCase()];
  if (source) {
    const bySource = getSubjectsForExam(source);
    if (bySource.length) return bySource.map((s) => s.name);
  }
  const other = EXAM_DATA.find((e) => e.id === "other");
  return other ? other.subjects.map((s) => s.name) : ["General Studies"];
}

export function chaptersFor(exam: string, subject: string): string[] {
  const resolved = resolveExam(exam);
  const source = resolved?.name ?? EXAM_SOURCE[exam] ?? EXAM_SOURCE[exam.toLowerCase()] ?? exam;
  // NEET UG stores Biology as Botany+Zoology — merge for legacy "Biology" backlog items
  if (source === "NEET UG" && subject === "Biology") {
    const neet = getExamByName("NEET UG");
    const lists = neet?.subjects
      .filter((s) => s.name === "Botany" || s.name === "Zoology")
      .map((s) => s.chapters) ?? [];
    return [...new Set(lists.flat())];
  }
  // direct lookup
  const direct = getChaptersForSubject(source, subject);
  if (direct.length) return direct;
  // case-insensitive subject fallback within the same exam
  const examObj = resolved ?? getExamByName(source);
  if (examObj) {
    const sub = examObj.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase());
    if (sub) return sub.chapters;
    // also try lower-case subject via getChaptersForSubject with exact exam name lower-case search
    const ci = getChaptersForSubject(
      examObj.name,
      examObj.subjects.find((s) => s.name.toLowerCase() === subject.toLowerCase())?.name ?? subject,
    );
    if (ci.length) return ci;
  }
  return direct;
}

export function examIdForBacklog(item: BacklogItem): string {
  const id = item.exam_id ?? (item.backlog_data as { exam?: string } | null)?.exam;
  if (!id) return "jee-main";
  const trimmed = String(id).trim();
  if (EXAM_LABEL[trimmed]) return trimmed;
  const lower = trimmed.toLowerCase();
  if (EXAM_LABEL[lower]) return lower;
  const resolved = resolveExam(trimmed);
  if (resolved) return resolved.id;
  return lower;
}

// ===========================================================================
// Active-exam scoping
// ===========================================================================

/**
 * Which stored exam ids belong to each backlog exam family. Used to build the
 * server-side `exam_id.in(...)` filter so other exams' data never loads.
 * Most exams are singletons; grouped families (JEE, NEET, Boards) include legacy aliases.
 */
const EXAM_FAMILIES: Record<string, string[]> = {
  "jee-main": ["jee-main", "jee-advanced", "jee", "jee-main+jee-advanced"],
  "jee-advanced": ["jee-main", "jee-advanced", "jee", "jee-main+jee-advanced"],
  jee: ["jee-main", "jee-advanced", "jee", "jee-main+jee-advanced"],
  "neet-ug": ["neet-ug", "neet", "neet ug"],
  neet: ["neet-ug", "neet", "neet ug"],
  boards: ["boards", "cbse-board", "cbse-12", "cbse-11", "cbse-10", "icse-board", "isc-board", "state-board", "school-general", "half-yearly", "annual-exams", "unit-tests", "pre-boards", "icse", "isc", "state-boards"],
  "cbse-board": ["cbse-board", "boards", "cbse-12", "cbse-11", "cbse-10"],
  "icse-board": ["icse-board", "isc-board", "icse", "isc"],
};

/**
 * Maps the user's selected exam (profile.target_exam — e.g. "JEE Main", "jee", "neet-ug",
 * "UPSC CSE", "cbse-12") to the backlog exam family it belongs to.
 * Returns an EXAM_DATA id for competitive exams or "boards"/"jee-main"/"neet-ug" for families.
 */
export function backlogExamFamily(targetExam?: string | null): string {
  const raw = (targetExam ?? "").trim();
  if (!raw) return "jee-main";
  const t = raw.toLowerCase().trim();
  if (["jee", "jee-main", "jee-advanced", "jee main", "jee advanced", "jee-main+jee-advanced"].includes(t)) return "jee-main";
  if (["neet", "neet-ug", "neet ug"].includes(t)) return "neet-ug";
  if (["boards", "cbse", "cbse-board", "cbse board", "cbse board exams", "cbse-12", "cbse-11", "cbse-10", "icse", "icse-board", "icse board", "icse board exams", "isc", "isc-board", "state-board", "state boards", "state board", "state board exams", "school-general", "school", "school exams (general)", "half-yearly", "half-yearly exams", "annual-exams", "annual exams", "unit-tests", "unit tests", "pre-boards", "pre-boards"].includes(t)) return "boards";
  const resolved = resolveExam(raw);
  if (resolved) return resolved.id;
  // fallback: lowercased raw for custom/other exams
  return t;
}

/** All stored exam_id values that belong to a backlog exam family. */
export function examIdMatchSet(family: string): string[] {
  if (EXAM_FAMILIES[family]) return EXAM_FAMILIES[family];
  const lower = family.toLowerCase().trim();
  if (EXAM_FAMILIES[lower]) return EXAM_FAMILIES[lower];
  return [family];
}

/** Aliases so fuzzy searches match the way students actually say chapters. */
const CHAPTER_ALIASES: Record<string, string[]> = {
  "Laws of Motion": ["Newton's Laws of Motion", "Newton's Laws", "Newtons Laws of Motion", "NLM"],
  Kinematics: ["Motion in a Straight Line", "Motion in a Plane", "Kinematics 1D", "Kinematics 2D"],
  Thermodynamics: ["Thermo", "Laws of Thermodynamics"],
  "Coordinate Geometry — Conic Sections": ["Conic Sections", "Conics"],
  "Coordinate Geometry — Circles": ["Circles"],
  "Coordinate Geometry — Straight Lines": ["Straight Lines"],
  "Complex Numbers and Quadratic Equations": ["Complex Numbers", "Quadratic Equations"],
  "Sets, Relations and Functions": ["Sets", "Relations", "Functions"],
  "Applications of Derivatives": ["AOD", "Maxima Minima"],
  "Integral Calculus": ["Indefinite Integrals", "Definite Integrals"],
  "Differential Equations": ["DE"],
  "Chemical Bonding and Molecular Structure": ["Chemical Bonding"],
  "Some Basic Concepts of Chemistry": ["Mole Concept"],
  "Structure of Atom": ["Atomic Structure"],
  "The d- and f-Block Elements": ["d and f Block"],
  "Coordination Compounds": ["Coordination Chemistry"],
  "Chemical Kinetics": ["Kinetics"],
  "Magnetic Effects of Current and Magnetism": ["Magnetism"],
  "Current Electricity": ["Electric Current"],
  "Ray Optics and Optical Instruments": ["Ray Optics"],
  "Wave Optics": ["Waves and Optics"],
  "Electromagnetic Induction and Alternating Currents": ["EMI and AC", "EMI"],
};

/**
 * Fuzzy match score: prefix match > substring > subsequence.
 * "ther" → Thermodynamics (substring), "nl" → Newton's Laws of Motion (alias/NLM).
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q || !t) return 0;
  const idx = t.indexOf(q);
  if (idx === 0) return 120 + q.length;
  if (idx > 0) return 90 + q.length - idx;
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += 4; qi++; }
  }
  if (qi === q.length) return 50 + score;
  return 0;
}

export function searchChapters(query: string, chapters: string[], limit = 8): string[] {
  const q = query.trim();
  if (!q) return chapters.slice(0, limit);
  const scored = chapters
    .map((name) => {
      let best = fuzzyScore(q, name);
      for (const alias of CHAPTER_ALIASES[name] ?? []) {
        const s = fuzzyScore(q, alias) - 2;
        if (s > best) best = s;
      }
      return { name, best };
    })
    .filter((r) => r.best > 0)
    .sort((a, b) => b.best - a.best);
  return scored.slice(0, limit).map((r) => r.name);
}

// ===========================================================================
// Priority / difficulty metadata
// ===========================================================================

export const PRIORITY_META: Record<Priority, { label: string; badge: string; dot: string }> = {
  critical: { label: "Critical", badge: "bg-danger-500/15 text-danger-400 border-danger-500/30", dot: "bg-danger-500" },
  high: { label: "High", badge: "bg-danger-600/15 text-danger-400 border-danger-600/30", dot: "bg-danger-500" },
  medium: { label: "Medium", badge: "bg-warning-600/15 text-warning-400 border-warning-600/30", dot: "bg-warning-500" },
  low: { label: "Low", badge: "bg-slate-600/15 text-slate-400 border-slate-600/30", dot: "bg-slate-500" },
};

export const PRIORITY_OPTIONS: Priority[] = ["low", "medium", "high", "critical"];

export const DIFFICULTY_META: Record<BacklogDifficulty, { label: string; badge: string }> = {
  easy: { label: "Easy", badge: "bg-success-600/15 text-success-400 border-success-600/30" },
  medium: { label: "Medium", badge: "bg-warning-600/15 text-warning-400 border-warning-600/30" },
  hard: { label: "Hard", badge: "bg-danger-600/15 text-danger-400 border-danger-600/30" },
};

export const DIFFICULTY_OPTIONS: BacklogDifficulty[] = ["easy", "medium", "hard"];

// ===========================================================================
// Progress helpers
// ===========================================================================

export function remainingOf(r?: BacklogResourceProgress): number {
  if (!r) return 0;
  return Math.max(0, (r.total ?? 0) - (r.completed ?? 0));
}

export function pctOf(r?: BacklogResourceProgress): number {
  if (!r || !r.total) return 0;
  return Math.max(0, Math.min(100, Math.round(((r.completed ?? 0) / r.total) * 100)));
}

/** Extract the resource progress map from a backlog row (backlog_data + legacy columns). */
export function extractBacklogResources(item: BacklogItem): Partial<Record<BacklogKind, BacklogResourceProgress>> {
  const out: Partial<Record<BacklogKind, BacklogResourceProgress>> = {};
  const data = item.backlog_data as { resources?: Record<string, { total?: number; completed?: number }> } | null;
  const stored = data?.resources ?? {};
  for (const [k, v] of Object.entries(stored)) {
    const kind = k as BacklogKind;
    out[kind] = { total: Math.max(0, v?.total ?? 0), completed: Math.max(0, Math.min(v?.total ?? 0, v?.completed ?? 0)) };
  }
  // Legacy columns (old items created before backlog_data.resources existed).
  // These run BEFORE the zero-init below so stored data wins but legacy values
  // are never shadowed by an empty placeholder.
  if (!out.lecture && (item.pending_lectures ?? 0) > 0) out.lecture = { total: item.pending_lectures ?? 0, completed: 0 };
  if (!out.module && (item.module_total_questions ?? 0) > 0) {
    out.module = {
      total: item.module_total_questions ?? 0,
      completed: Math.min(item.module_total_questions ?? 0, item.module_solved_questions ?? 0),
    };
  }
  if (!out.dpp && (item.pending_dpps ?? 0) > 0) out.dpp = { total: item.pending_dpps ?? 0, completed: 0 };
  if (!out.pyq && (item.pending_pyqs ?? 0) > 0) out.pyq = { total: item.pending_pyqs ?? 0, completed: 0 };
  if (!out.revision && (item.revision_pending ?? 0) > 0) out.revision = { total: item.revision_pending ?? 0, completed: 0 };
  const kinds = item.backlog_types ?? [];
  for (const k of kinds) {
    if (!out[k]) out[k] = { total: 0, completed: 0 };
  }
  return out;
}

export function resourceSummary(resources: Partial<Record<BacklogKind, BacklogResourceProgress>>): {
  total: number; completed: number; remaining: number; pct: number;
} {
  let total = 0;
  let completed = 0;
  for (const r of Object.values(resources)) {
    if (!r) continue;
    total += Math.max(0, r.total ?? 0);
    completed += Math.max(0, Math.min(r.total ?? 0, r.completed ?? 0));
  }
  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Estimated minutes to clear all remaining work across the item's resources. */
export function estimatedMinutesFor(item: BacklogItem): number {
  const res = extractBacklogResources(item);
  let total = 0;
  for (const [kind, r] of Object.entries(res)) {
    if (!r) continue;
    total += Math.round(remainingOf(r) * resourceMeta(kind as BacklogKind).perUnitMin);
  }
  if (total > 0) return total;
  return item.estimated_minutes ?? 0;
}

const FALLBACK_PALETTE = ["#38bdf8", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444", "#14b8a6", "#6366f1", "#f97316", "#06b6d4", "#eab308", "#ec4899", "#a78bfa", "#22c55e", "#0ea5e9"];

function hashColor(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

export function subjectColor(subject?: string | null): string {
  if (!subject) return "#64748b";
  const direct = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS[subject.toLowerCase()] ?? SUBJECT_COLORS[subject.trim()];
  if (direct) return direct;
  // deterministic fallback so every new subject gets a stable color instead of gray
  return hashColor(subject.toLowerCase().trim());
}

export function minutesToHM(min: number): string {
  if (min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ===========================================================================
// Recent entries (local cache, offline-friendly)
// ===========================================================================

export interface RecentBacklog {
  exam: string;
  subject: string;
  chapter: string;
  kind: BacklogKind;
}

const RECENT_KEY = "studyshield:recentBacklogs";

export function loadRecent(): RecentBacklog[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as RecentBacklog[];
    return Array.isArray(raw) ? raw.filter((r) => r && r.chapter && r.kind) : [];
  } catch { return []; }
}

export function pushRecent(entry: RecentBacklog): void {
  const list = [entry, ...loadRecent().filter((e) => !(e.subject === entry.subject && e.chapter === entry.chapter && e.kind === entry.kind))].slice(0, 6);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
