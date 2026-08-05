import type {
  AppData, User, Task, Subject, Chapter, FocusSession,
  Formula, FormulaView, PYQAttempt, MockTest, Achievement, PomodoroState,
} from "./types";
import { STORAGE_KEY, APP_VERSION, ACHIEVEMENTS, SUBJECT_COLORS, uid } from "./constants";
import { seedFormulasForExam } from "./formulaData";
import type { ExamPreset } from "./types";

const EMPTY: AppData = {
  version: APP_VERSION,
  user: null,
  tasks: [],
  subjects: [],
  chapters: [],
  focusSessions: [],
  formulas: [],
  formulaViews: [],
  pyqAttempts: [],
  mockTests: [],
  achievements: ACHIEVEMENTS.map((a: (typeof ACHIEVEMENTS)[number]) => ({ ...a, unlockedAt: null })),
  pomodoro: null,
};

class Storage {
  private cache: AppData | null = null;

  read(): AppData {
    if (this.cache) return this.cache;
    let raw: string | null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch { raw = null; }
    if (!raw) { this.cache = { ...EMPTY }; return this.cache; }
    try {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      const data: AppData = {
        version: APP_VERSION,
        user: parsed.user ?? null,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
        chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
        focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions : [],
        formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
        formulaViews: Array.isArray(parsed.formulaViews) ? parsed.formulaViews : [],
        pyqAttempts: Array.isArray(parsed.pyqAttempts) ? parsed.pyqAttempts : [],
        mockTests: Array.isArray(parsed.mockTests) ? parsed.mockTests : [],
        achievements: Array.isArray(parsed.achievements) && parsed.achievements.length === ACHIEVEMENTS.length
          ? parsed.achievements
          : ACHIEVEMENTS.map((a: (typeof ACHIEVEMENTS)[number]) => ({ ...a, unlockedAt: null })),
        pomodoro: parsed.pomodoro ?? null,
      };
      this.cache = data;
      return data;
    } catch {
      this.cache = { ...EMPTY };
      return this.cache;
    }
  }

  write(data: AppData): void {
    this.cache = data;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ }
  }

  patch(updater: (data: AppData) => AppData): AppData {
    const next = updater({ ...this.read() });
    this.write(next);
    return next;
  }

  getUser(): User | null { return this.read().user; }
  setUser(user: User | null): void { this.patch((d) => ({ ...d, user })); }

  getTasks(): Task[] { return this.read().tasks; }
  setTasks(tasks: Task[]): void { this.patch((d) => ({ ...d, tasks })); }
  getSubjects(): Subject[] { return this.read().subjects; }
  setSubjects(subjects: Subject[]): void { this.patch((d) => ({ ...d, subjects })); }
  getChapters(): Chapter[] { return this.read().chapters; }
  setChapters(chapters: Chapter[]): void { this.patch((d) => ({ ...d, chapters })); }
  getFocusSessions(): FocusSession[] { return this.read().focusSessions; }
  setFocusSessions(s: FocusSession[]): void { this.patch((d) => ({ ...d, focusSessions: s })); }
  getFormulas(): Formula[] { return this.read().formulas; }
  setFormulas(f: Formula[]): void { this.patch((d) => ({ ...d, formulas: f })); }
  getFormulaViews(): FormulaView[] { return this.read().formulaViews; }
  setFormulaViews(v: FormulaView[]): void { this.patch((d) => ({ ...d, formulaViews: v })); }
  getPYQAttempts(): PYQAttempt[] { return this.read().pyqAttempts; }
  setPYQAttempts(p: PYQAttempt[]): void { this.patch((d) => ({ ...d, pyqAttempts: p })); }
  getMockTests(): MockTest[] { return this.read().mockTests; }
  setMockTests(m: MockTest[]): void { this.patch((d) => ({ ...d, mockTests: m })); }
  getAchievements(): Achievement[] { return this.read().achievements; }
  setAchievements(a: Achievement[]): void { this.patch((d) => ({ ...d, achievements: a })); }
  getPomodoro(): PomodoroState | null { return this.read().pomodoro; }
  setPomodoro(p: PomodoroState | null): void { this.patch((d) => ({ ...d, pomodoro: p })); }

  seedSubjectsForExam(exam: ExamPreset, subjectNames: string[]): Subject[] {
    const existing = this.getSubjects().filter((s) => s.exam !== exam);
    const names = subjectNames.length > 0 ? subjectNames : (existing.filter((s) => s.exam === exam).map((s) => s.name));
    const subjects: Subject[] = names.map((n) => ({
      id: uid("subj"), name: n, color: SUBJECT_COLORS[n] || "#64748b", exam,
    }));
    this.setSubjects([...existing.filter((s) => !names.includes(s.name)), ...subjects]);
    const currentFormulas = this.getFormulas();
    const otherExamFormulas = currentFormulas.filter((f) => f.exam !== exam);
    const examFormulas = seedFormulasForExam(exam);
    this.setFormulas([...otherExamFormulas, ...examFormulas]);
    return subjects;
  }

  clearAll(): void {
    this.cache = { ...EMPTY };
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }
}

export const storage = new Storage();

// ===== Formula Vault Storage =====
// Lightweight localStorage helpers for the Formula Vault user data.
// These are kept separate from the main Storage class because the Formula
// Vault data model lives in src/types/index.ts (not src/lib/types.ts).
const FORMULA_VAULT_KEY = 'studyshield-formula-vault';

export interface FormulaVaultData {
  favorites: string[];
  recentlyViewed: string[];
  revisionList: string[];
  frequentlyUsed: string[];
}

export function loadFormulaVault(userId: string): FormulaVaultData {
  const key = `${FORMULA_VAULT_KEY}-${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { favorites: [], recentlyViewed: [], revisionList: [], frequentlyUsed: [] };
    const parsed = JSON.parse(raw) as Partial<FormulaVaultData>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recentlyViewed: Array.isArray(parsed.recentlyViewed) ? parsed.recentlyViewed : [],
      revisionList: Array.isArray(parsed.revisionList) ? parsed.revisionList : [],
      frequentlyUsed: Array.isArray(parsed.frequentlyUsed) ? parsed.frequentlyUsed : [],
    };
  } catch {
    return { favorites: [], recentlyViewed: [], revisionList: [], frequentlyUsed: [] };
  }
}

export function saveFormulaVault(userId: string, data: FormulaVaultData): void {
  const key = `${FORMULA_VAULT_KEY}-${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* quota */ }
}
