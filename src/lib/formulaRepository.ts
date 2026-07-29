import type { Formula, ExamPreset } from "./types";
import { seedFormulasForExam } from "./formulaData";
import { storage } from "./storage";

export type FormulaSource = "local" | "supabase";

export interface FormulaFetchOptions {
  exam: ExamPreset;
  forceRefresh?: boolean;
}

export interface FormulaFetchResult {
  formulas: Formula[];
  source: FormulaSource;
  fromCache: boolean;
}

/**
 * Repository layer for formulas. Designed so that the data source can be
 * swapped from Local Storage to Supabase without changing any call site.
 *
 * Migration path to Supabase:
 *   1. Create a `formulas` table (columns mirror the Formula interface).
 *   2. Replace `loadFromLocal()` with a Supabase query:
 *        supabase.from('formulas').select('*').eq('exam', exam)
 *   3. Keep the local seed as a fallback when Supabase returns no rows
 *      (offline-first behavior).
 *
 * Every public method returns a stable Formula[] so consumers (FormulaVault)
 * never need to know where the data came from.
 */
class FormulaRepository {
  private cache: Map<ExamPreset, Formula[]> = new Map();

  async fetchForExam(opts: FormulaFetchOptions): Promise<FormulaFetchResult> {
    const { exam, forceRefresh } = opts;
    if (!forceRefresh && this.cache.has(exam)) {
      return { formulas: this.cache.get(exam)!, source: "local", fromCache: true };
    }
    const local = this.loadFromLocal(exam);
    if (local.length > 0) {
      this.cache.set(exam, local);
      return { formulas: local, source: "local", fromCache: false };
    }
    const seeded = seedFormulasForExam(exam);
    if (seeded.length > 0) storage.setFormulas(seeded);
    this.cache.set(exam, seeded);
    return { formulas: seeded, source: "local", fromCache: false };
  }

  private loadFromLocal(exam: ExamPreset): Formula[] {
    return storage.getFormulas().filter((f) => f.exam === exam);
  }

  invalidateCache(exam?: ExamPreset): void {
    if (exam) this.cache.delete(exam);
    else this.cache.clear();
  }

  async reseedForExam(exam: ExamPreset): Promise<Formula[]> {
    this.invalidateCache(exam);
    const existing = storage.getFormulas();
    const otherExams = existing.filter((f) => f.exam !== exam);
    const fresh = seedFormulasForExam(exam);
    const merged = [...otherExams, ...fresh];
    storage.setFormulas(merged);
    this.cache.set(exam, fresh);
    return fresh;
  }
}

export const formulaRepository = new FormulaRepository();
