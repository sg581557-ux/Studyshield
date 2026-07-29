import type { Formula, FormulaSubject, FormulaCategory } from '../../types';
import { physicsFormulas } from './physics';
import { chemistryFormulas } from './chemistry';
import { mathematicsFormulas } from './mathematics';

export const allFormulas: Formula[] = [...physicsFormulas, ...chemistryFormulas, ...mathematicsFormulas];

export function getFormulasBySubject(subject: FormulaSubject): Formula[] {
  return allFormulas.filter((f) => f.subject === subject);
}

export function getFormulaCategories(subject: FormulaSubject): FormulaCategory[] {
  const cats = new Set<FormulaCategory>();
  for (const f of allFormulas) {
    if (f.subject === subject) cats.add(f.category);
  }
  return Array.from(cats);
}

export function getChaptersByCategory(subject: FormulaSubject, category: FormulaCategory): string[] {
  return Array.from(new Set(allFormulas.filter((f) => f.subject === subject && f.category === category).map((f) => f.chapter)));
}

export function getFormulaById(id: string): Formula | undefined {
  return allFormulas.find((f) => f.id === id);
}

export function searchFormulas(query: string): Formula[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return allFormulas.filter((f) =>
    f.name.toLowerCase().includes(q) ||
    f.formula.toLowerCase().includes(q) ||
    f.chapter.toLowerCase().includes(q) ||
    f.subject.toLowerCase().includes(q) ||
    (f.notes?.toLowerCase().includes(q) ?? false) ||
    (f.jeeTip?.toLowerCase().includes(q) ?? false)
  );
}

export function getRandomFormulas(count: number): Formula[] {
  const shuffled = [...allFormulas].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
